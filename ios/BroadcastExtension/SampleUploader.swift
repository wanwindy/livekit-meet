import Foundation
import ReplayKit

private enum SampleUploaderConstants {
  static let bufferMaxLength = 10240
}

final class SampleUploader {
  private static let imageContext = CIContext(options: nil)

  @Atomic private var isReady = false

  private let connection: SocketConnection
  private var dataToSend: Data?
  private var byteIndex = 0
  private let serialQueue = DispatchQueue(label: "com.livekit.broadcast.sampleUploader")

  init(connection: SocketConnection) {
    self.connection = connection
    setupConnection()
  }

  @discardableResult
  func send(sample buffer: CMSampleBuffer) -> Bool {
    guard isReady else {
      return false
    }

    isReady = false
    guard let preparedData = prepare(sample: buffer) else {
      isReady = true
      return false
    }

    serialQueue.async { [weak self] in
      guard let self else {
        return
      }

      self.dataToSend = preparedData
      self.byteIndex = 0
      self.sendDataChunk()
    }

    return true
  }
}

private extension SampleUploader {
  func setupConnection() {
    connection.didOpen = { [weak self] in
      self?.isReady = true
    }

    connection.streamHasSpaceAvailable = { [weak self] in
      self?.serialQueue.async {
        self?.sendDataChunk()
      }
    }
  }

  func sendDataChunk() {
    guard let dataToSend else {
      return
    }

    var bytesLeft = dataToSend.count - byteIndex
    let maxLength =
      bytesLeft > SampleUploaderConstants.bufferMaxLength
      ? SampleUploaderConstants.bufferMaxLength
      : bytesLeft

    let bytesWritten = dataToSend[byteIndex..<(byteIndex + maxLength)].withUnsafeBytes {
      guard let pointer = $0.bindMemory(to: UInt8.self).baseAddress else {
        return 0
      }

      return connection.writeToStream(buffer: pointer, maxLength: maxLength)
    }

    if bytesWritten > 0 {
      byteIndex += bytesWritten
      bytesLeft -= bytesWritten

      if bytesLeft == 0 {
        self.dataToSend = nil
        byteIndex = 0
        isReady = true
      }
    } else if bytesWritten < 0 {
      print("writeBufferToStream failure")
      self.dataToSend = nil
      byteIndex = 0
      isReady = true
    }
  }

  func prepare(sample buffer: CMSampleBuffer) -> Data? {
    guard let imageBuffer = CMSampleBufferGetImageBuffer(buffer) else {
      print("image buffer not available")
      return nil
    }

    CVPixelBufferLockBaseAddress(imageBuffer, .readOnly)

    let scaleFactor = 2.0
    let width = CVPixelBufferGetWidth(imageBuffer) / Int(scaleFactor)
    let height = CVPixelBufferGetHeight(imageBuffer) / Int(scaleFactor)
    let orientation =
      CMGetAttachment(
        buffer,
        key: RPVideoSampleOrientationKey as CFString,
        attachmentModeOut: nil
      )?.uintValue ?? 0

    let scaleTransform = CGAffineTransform(
      scaleX: CGFloat(1.0 / scaleFactor),
      y: CGFloat(1.0 / scaleFactor)
    )
    let bufferData = jpegData(from: imageBuffer, scale: scaleTransform)

    CVPixelBufferUnlockBaseAddress(imageBuffer, .readOnly)

    guard let messageData = bufferData else {
      print("corrupted image buffer")
      return nil
    }

    let httpResponse =
      CFHTTPMessageCreateResponse(nil, 200, nil, kCFHTTPVersion1_1).takeRetainedValue()
    CFHTTPMessageSetHeaderFieldValue(
      httpResponse,
      "Content-Length" as CFString,
      String(messageData.count) as CFString
    )
    CFHTTPMessageSetHeaderFieldValue(
      httpResponse,
      "Buffer-Width" as CFString,
      String(width) as CFString
    )
    CFHTTPMessageSetHeaderFieldValue(
      httpResponse,
      "Buffer-Height" as CFString,
      String(height) as CFString
    )
    CFHTTPMessageSetHeaderFieldValue(
      httpResponse,
      "Buffer-Orientation" as CFString,
      String(orientation) as CFString
    )
    CFHTTPMessageSetBody(httpResponse, messageData as CFData)

    return CFHTTPMessageCopySerializedMessage(httpResponse)?.takeRetainedValue() as Data?
  }

  func jpegData(from buffer: CVPixelBuffer, scale scaleTransform: CGAffineTransform) -> Data? {
    let image = CIImage(cvPixelBuffer: buffer).transformed(by: scaleTransform)

    guard let colorSpace = image.colorSpace else {
      return nil
    }

    let options: [CIImageRepresentationOption: Float] = [
      kCGImageDestinationLossyCompressionQuality as CIImageRepresentationOption: 1.0,
    ]

    return SampleUploader.imageContext.jpegRepresentation(
      of: image,
      colorSpace: colorSpace,
      options: options
    )
  }
}
