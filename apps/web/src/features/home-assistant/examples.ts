export const HOME_ASSISTANT_REPO_URL = 'https://github.com/JoelBrenstrum/babble-home-assistant';

export interface Example {
  title: string;
  body: string;
  yaml: string;
}

export const EXAMPLES: Example[] = [
  {
    title: 'Quiet the doorbell during naps',
    body: "Turns the chime off when a nap starts and back on when it ends. If Home Assistant can't reach babble, the chime comes back on, so it's never left silent. Swap in your own chime entity. Reolink and UniFi Protect doorbells have one; for others, mute the notification instead.",
    yaml: `alias: Quiet doorbell while baby naps
mode: restart
triggers:
  - trigger: state
    entity_id: binary_sensor.olive_asleep
actions:
  - if:
      - condition: state
        entity_id: binary_sensor.olive_asleep
        state: "on"
    then:
      - action: switch.turn_off
        target:
          entity_id: switch.front_door_chime
    else:
      - action: switch.turn_on
        target:
          entity_id: switch.front_door_chime`,
  },
  {
    title: 'Tell me when a feed is overdue',
    body: 'Feed overdue turns on once the next feed is due. It stays off overnight if you set feed reminders to stay quiet at night.',
    yaml: `alias: Feed overdue
triggers:
  - trigger: state
    entity_id: binary_sensor.olive_feed_overdue
    to: "on"
actions:
  - action: notify.notify
    data:
      title: Feed due
      message: >
        Last fed {{ as_timestamp(states('sensor.olive_last_feed')) | timestamp_custom('%H:%M') }},
        {{ states('sensor.olive_next_breast_side') }} side next.`,
  },
  {
    title: 'A fridge dashboard',
    body: 'A Markdown card that reads well on an e-ink screen. It shows clock times rather than countdowns, so it stays right between refreshes.',
    yaml: `type: markdown
content: >
  {% set asleep = is_state('binary_sensor.olive_asleep', 'on') %}
  {% set due = states('sensor.olive_next_feed_due') %}
  ## {{ 'Asleep' if asleep else 'Awake' }}
  {% if asleep %}
  Since {{ as_timestamp(state_attr('sensor.olive_current_sleep', 'started_at')) | timestamp_custom('%H:%M') }},
  {{ states('sensor.olive_current_sleep') | int }} min so far
  {% elif has_value('sensor.olive_awake_since') %}
  Since {{ as_timestamp(states('sensor.olive_awake_since')) | timestamp_custom('%H:%M') }}
  {% endif %}

  ## Next feed {{ as_timestamp(due) | timestamp_custom('%H:%M') if has_value('sensor.olive_next_feed_due') else '–' }}
  {{ states('sensor.olive_next_breast_side') | capitalize }} side next`,
  },
];

export const SENSOR_GROUPS: { title: string; items: string[] }[] = [
  {
    title: 'Sleep',
    items: [
      'Asleep, on or off',
      'Current sleep length, leaving out pauses',
      'Awake since',
      'Sleep timer state, with the last sleep',
    ],
  },
  {
    title: 'Feeds',
    items: [
      'Next feed due',
      'Feed overdue',
      'Last feed and the next breast side',
      'Breastfeed timer with time on each side',
      'Last bottle and last solids',
    ],
  },
  {
    title: 'And the rest',
    items: [
      'Last nappy, wet or dirty',
      'Pumping',
      'Growth, with WHO percentiles',
      "Today's sleep, naps, feeds, bottles and nappies",
      'Predicted next nap and feed',
    ],
  },
];
