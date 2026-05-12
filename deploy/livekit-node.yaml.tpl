port: 7880
bind_addresses:
  - ""
rtc:
  tcp_port: 7881
  port_range_start: 50000
  port_range_end: 60000
  use_external_ip: false
  node_ip: "{{NODE_IP}}"
redis:
  address: "{{REDIS_ADDRESS}}"
  password: "{{REDIS_PASSWORD}}"
keys:
  "{{LIVEKIT_API_KEY}}": "{{LIVEKIT_API_SECRET}}"
room:
  enabled_codecs:
    - mime: audio/opus
    - mime: video/h264
    - mime: video/vp8
node_selector:
  kind: regionaware
  sysload_limit: 0.5
region: "{{REGION}}"
node_name: "{{NODE_NAME}}"
turn:
  enabled: true
  domain: "{{TURN_DOMAIN}}"
  udp_port: 3478
logging:
  level: info

