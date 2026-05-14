// iOS keeps the audio session active in the background through
// AudioSession/useIOSAudioManagement plus UIBackgroundModes=audio.
// A more robust CallKit integration is still a native follow-up task.
export async function startCallService() {
  return;
}

export async function stopCallService() {
  return;
}
