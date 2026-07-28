export type ParticipantPresenceInput = {
  identity: string;
  name?: string | null;
};

export type ParticipantPresence = {
  identity: string;
  displayName: string;
};

export const getMeetingParticipants = (
  participants: ParticipantPresenceInput[],
): ParticipantPresence[] =>
  participants
    .filter(participant => !participant.identity.startsWith('host-'))
    .map(participant => ({
      identity: participant.identity,
      displayName: participant.name?.trim() || '参会人',
    }));

export const getNewlyJoinedParticipants = (
  previousIdentities: Set<string>,
  participants: ParticipantPresence[],
) =>
  participants.filter(
    participant => !previousIdentities.has(participant.identity),
  );
