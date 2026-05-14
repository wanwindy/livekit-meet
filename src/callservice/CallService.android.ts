import ReactNativeForegroundService from '@supersami/rn-foreground-service';

// Keep the conference alive when the app moves to the background.
// Android screenshare itself uses the WebRTC mediaProjection service.
export async function startCallService() {
  await ReactNativeForegroundService.start({
    id: 3456,
    title: '放心办视频会议',
    message: '会议进行中，正在保持音频与画面连接',
    importance: 'low',
    vibration: false,
    icon: 'ic_launcher',
    setOnlyAlertOnce: true,
  });
}
export async function stopCallService() {
  await ReactNativeForegroundService.stop();
}
