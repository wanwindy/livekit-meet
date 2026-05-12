import {AccessToken} from 'livekit-server-sdk';
import {customAlphabet} from 'nanoid';
import {config} from './config.js';
import {badRequest, HttpError} from './httpError.js';
import {query, queryOne, transaction} from './db.js';
import {chooseNode, decidePreferredRegion} from './regionPolicy.js';

const meetingNumberAlphabet = '1234567890';
const roomNameAlphabet = '0123456789abcdefghijklmnopqrstuvwxyz';
const createMeetingNumber = customAlphabet(meetingNumberAlphabet, 6);
const createRoomSuffix = customAlphabet(roomNameAlphabet, 12);

export const assertLiveKitConfigured = () => {
  if (!config.livekit.apiKey || !config.livekit.apiSecret) {
    throw new HttpError(503, 'LiveKit 签发服务未配置', 'livekit_not_configured');
  }
};

export const issueRoomToken = async ({roomName, identity, displayName, role}) => {
  assertLiveKitConfigured();

  const token = new AccessToken(config.livekit.apiKey, config.livekit.apiSecret, {
    identity,
    name: displayName || identity,
    ttl: '6h',
  });

  token.addGrant({
    room: roomName,
    roomJoin: true,
    canPublish: true,
    canSubscribe: true,
    canPublishData: true,
    roomAdmin: role === 'host',
  });

  return token.toJwt();
};

export const listLiveKitNodes = async () => {
  const rows = await query(
    `select id, region, name, signal_url as signalUrl, status, last_health_at as lastHealthAt,
            load_score as loadScore, updated_at as updatedAt
     from livekit_nodes
     order by field(region, 'hk', 'sg', 'cn'), name`,
  );

  if (rows.length > 0) {
    return rows;
  }

  return Object.entries(config.livekit.regionSignals)
    .filter(([, signalUrl]) => Boolean(signalUrl))
    .map(([region, signalUrl]) => ({
      id: null,
      region,
      name: `${region}-env`,
      signalUrl,
      status: region === config.livekit.defaultRegion ? 'healthy' : 'offline',
      lastHealthAt: null,
      loadScore: null,
      updatedAt: null,
    }));
};

export const selectNodeForMeeting = async ({preferredRegion, audienceRegion}) => {
  const desiredRegion = decidePreferredRegion({preferredRegion, audienceRegion});
  const nodes = await listLiveKitNodes();
  const node = chooseNode({nodes, preferredRegion: desiredRegion});

  if (!node) {
    throw new HttpError(503, '没有可用的会议节点', 'no_livekit_node_available');
  }

  return {node, preferredRegion: desiredRegion};
};

export const createMeetingForHost = async ({
  hostAccount,
  preferredRegion,
  audienceRegion,
  displayName,
}) => {
  const {node, preferredRegion: selectedRegion} = await selectNodeForMeeting({
    preferredRegion,
    audienceRegion,
  });

  return transaction(async connection => {
    let meetingNumber;
    let roomName;

    for (let attempt = 0; attempt < 5; attempt += 1) {
      meetingNumber = createMeetingNumber();
      roomName = `room-${selectedRegion}-${createRoomSuffix()}`;
      const [existing] = await connection.execute(
        'select id from meetings where meeting_number = :meetingNumber or room_name = :roomName',
        {meetingNumber, roomName},
      );

      if (existing.length === 0) {
        break;
      }

      meetingNumber = undefined;
      roomName = undefined;
    }

    if (!meetingNumber || !roomName) {
      throw badRequest('会议号生成失败，请重试', 'meeting_number_collision');
    }

    await connection.execute(
      `insert into meetings
        (meeting_number, room_name, host_account_id, preferred_region, livekit_url, status)
       values
        (:meetingNumber, :roomName, :hostAccountId, :preferredRegion, :livekitUrl, 'created')`,
      {
        meetingNumber,
        roomName,
        hostAccountId: hostAccount.id,
        preferredRegion: selectedRegion,
        livekitUrl: node.signalUrl,
      },
    );

    const token = await issueRoomToken({
      roomName,
      identity: `host-${hostAccount.id}`,
      displayName: displayName || hostAccount.display_name || hostAccount.username,
      role: 'host',
    });

    return {
      meetingNumber,
      roomName,
      serverUrl: node.signalUrl,
      region: selectedRegion,
      token,
    };
  });
};

export const findMeetingByNumber = meetingNumber =>
  queryOne(
    `select id, meeting_number as meetingNumber, room_name as roomName,
            host_account_id as hostAccountId, preferred_region as preferredRegion,
            livekit_url as livekitUrl, status, created_at as createdAt
     from meetings
     where meeting_number = :meetingNumber`,
    {meetingNumber},
  );
