import Foundation
import ReplayKit

private enum SampleHandlerConstants {
  static let appGroupIdentifierKey = "RTCAppGroupIdentifier"
  static let socketFileName = "rtc_SSFD"
}

final class SampleHandler: RPBroadcastSampleHandler {
  private var clientConnection: SocketConnection?
  private var uploader: SampleUploader?
  private var frameCount = 0

  override func broadcastStarted(withSetupInfo setupInfo: [String: NSObject]?) {
    frameCount = 0

    do {
      try configureConnection()
      DarwinNotificationCenter.shared.postNotification(.broadcastStarted)
      openConnection()
    } catch {
      finishBroadcastWithError(error)
    }
  }

  override func broadcastPaused() {}

  override func broadcastResumed() {}

  override func broadcastFinished() {
    DarwinNotificationCenter.shared.postNotification(.broadcastStopped)
    clientConnection?.close()
  }

  override func processSampleBuffer(
    _ sampleBuffer: CMSampleBuffer,
    with sampleBufferType: RPSampleBufferType
  ) {
    guard sampleBufferType == .video else {
      return
    }

    frameCount += 1
    if frameCount % 3 == 0 {
      uploader?.send(sample: sampleBuffer)
    }
  }
}

private extension SampleHandler {
  enum BroadcastSetupError: LocalizedError {
    case missingAppGroupIdentifier
    case missingSharedContainer
    case unavailableSocketConnection

    var errorDescription: String? {
      switch self {
      case .missingAppGroupIdentifier:
        return "Missing RTCAppGroupIdentifier for screen sharing."
      case .missingSharedContainer:
        return "Unable to access the shared app group container."
      case .unavailableSocketConnection:
        return "Unable to create the screen sharing socket connection."
      }
    }
  }

  var socketFilePath: String {
    get throws {
      guard
        let appGroupIdentifier =
          Bundle.main.object(forInfoDictionaryKey: SampleHandlerConstants.appGroupIdentifierKey)
          as? String
      else {
        throw BroadcastSetupError.missingAppGroupIdentifier
      }

      guard
        let sharedContainer = FileManager.default.containerURL(
          forSecurityApplicationGroupIdentifier: appGroupIdentifier
        )
      else {
        throw BroadcastSetupError.missingSharedContainer
      }

      return sharedContainer
        .appendingPathComponent(SampleHandlerConstants.socketFileName)
        .path
    }
  }

  func configureConnection() throws {
    let socketFilePath = try socketFilePath

    guard let connection = SocketConnection(filePath: socketFilePath) else {
      throw BroadcastSetupError.unavailableSocketConnection
    }

    clientConnection = connection
    setupConnection()
    uploader = SampleUploader(connection: connection)
  }

  func setupConnection() {
    clientConnection?.didClose = { [weak self] error in
      if let error {
        self?.finishBroadcastWithError(error)
        return
      }

      let stoppedCode = 10001
      let customError = NSError(
        domain: RPRecordingErrorDomain,
        code: stoppedCode,
        userInfo: [NSLocalizedDescriptionKey: "Screen sharing stopped"]
      )
      self?.finishBroadcastWithError(customError)
    }
  }

  func openConnection() {
    let queue = DispatchQueue(label: "broadcast.connectTimer")
    let timer = DispatchSource.makeTimerSource(queue: queue)

    timer.schedule(deadline: .now(), repeating: .milliseconds(100), leeway: .milliseconds(500))
    timer.setEventHandler { [weak self] in
      guard self?.clientConnection?.open() == true else {
        return
      }

      timer.cancel()
    }

    timer.resume()
  }
}
