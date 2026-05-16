import Foundation

final class SocketConnection: NSObject {
  var didOpen: (() -> Void)?
  var didClose: ((Error?) -> Void)?
  var streamHasSpaceAvailable: (() -> Void)?

  private let filePath: String
  private var socketHandle: Int32 = -1
  private var address: sockaddr_un?
  private var inputStream: InputStream?
  private var outputStream: OutputStream?
  private var networkQueue: DispatchQueue?
  private var shouldKeepRunning = false

  init?(filePath path: String) {
    filePath = path
    socketHandle = Darwin.socket(AF_UNIX, SOCK_STREAM, 0)

    guard socketHandle != -1 else {
      print("failure: create socket")
      return nil
    }
  }

  func open() -> Bool {
    guard FileManager.default.fileExists(atPath: filePath) else {
      print("failure: socket file missing")
      return false
    }

    guard setupAddress(), connectSocket() else {
      return false
    }

    setupStreams()
    inputStream?.open()
    outputStream?.open()
    return true
  }

  func close() {
    unscheduleStreams()
    inputStream?.delegate = nil
    outputStream?.delegate = nil
    inputStream?.close()
    outputStream?.close()
    inputStream = nil
    outputStream = nil
  }

  func writeToStream(buffer: UnsafePointer<UInt8>, maxLength length: Int) -> Int {
    outputStream?.write(buffer, maxLength: length) ?? 0
  }
}

extension SocketConnection: StreamDelegate {
  func stream(_ aStream: Stream, handle eventCode: Stream.Event) {
    switch eventCode {
    case .openCompleted:
      if aStream == outputStream {
        didOpen?()
      }
    case .hasBytesAvailable:
      if aStream == inputStream {
        var buffer: UInt8 = 0
        let bytesRead = inputStream?.read(&buffer, maxLength: 1) ?? 0

        if bytesRead == 0 && aStream.streamStatus == .atEnd {
          close()
          notifyDidClose(error: nil)
        }
      }
    case .hasSpaceAvailable:
      if aStream == outputStream {
        streamHasSpaceAvailable?()
      }
    case .errorOccurred:
      close()
      notifyDidClose(error: aStream.streamError)
    default:
      break
    }
  }
}

private extension SocketConnection {
  func setupAddress() -> Bool {
    var addr = sockaddr_un()
    let addressLength = MemoryLayout.size(ofValue: addr)

    guard filePath.count < MemoryLayout.size(ofValue: addr.sun_path) else {
      print("failure: fd path is too long")
      return false
    }

    addr.sun_family = sa_family_t(AF_UNIX)
    addr.sun_len = UInt8(addressLength)

    _ = withUnsafeMutablePointer(to: &addr.sun_path.0) { pointer in
      filePath.withCString { pathPointer in
        strncpy(pointer, pathPointer, filePath.count)
      }
    }

    address = addr
    return true
  }

  func connectSocket() -> Bool {
    guard var addr = address else {
      return false
    }

    let addressLength = socklen_t(MemoryLayout.size(ofValue: addr))
    let status = withUnsafePointer(to: &addr) { pointer in
      pointer.withMemoryRebound(to: sockaddr.self, capacity: 1) {
        Darwin.connect(socketHandle, $0, addressLength)
      }
    }

    guard status == noErr else {
      print("failure: \(status)")
      return false
    }

    return true
  }

  func setupStreams() {
    var readStream: Unmanaged<CFReadStream>?
    var writeStream: Unmanaged<CFWriteStream>?

    CFStreamCreatePairWithSocket(kCFAllocatorDefault, socketHandle, &readStream, &writeStream)

    inputStream = readStream?.takeRetainedValue()
    inputStream?.delegate = self
    inputStream?.setProperty(
      kCFBooleanTrue,
      forKey: Stream.PropertyKey(kCFStreamPropertyShouldCloseNativeSocket as String)
    )

    outputStream = writeStream?.takeRetainedValue()
    outputStream?.delegate = self
    outputStream?.setProperty(
      kCFBooleanTrue,
      forKey: Stream.PropertyKey(kCFStreamPropertyShouldCloseNativeSocket as String)
    )

    scheduleStreams()
  }

  func scheduleStreams() {
    shouldKeepRunning = true
    networkQueue = DispatchQueue.global(qos: .userInitiated)

    networkQueue?.async { [weak self] in
      self?.inputStream?.schedule(in: .current, forMode: .common)
      self?.outputStream?.schedule(in: .current, forMode: .common)

      var isRunning = false
      repeat {
        isRunning =
          (self?.shouldKeepRunning ?? false)
          && RunLoop.current.run(mode: .default, before: .distantFuture)
      } while isRunning
    }
  }

  func unscheduleStreams() {
    shouldKeepRunning = false

    networkQueue?.sync { [weak self] in
      self?.inputStream?.remove(from: .current, forMode: .common)
      self?.outputStream?.remove(from: .current, forMode: .common)
    }
  }

  func notifyDidClose(error: Error?) {
    didClose?(error)
  }
}
