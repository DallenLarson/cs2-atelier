export const DRILLS = [
  {
    id: "aim",
    name: "First-bullet discipline",
    category: "Aim",
    level: "Beginner",
    minutes: 5,
    objective: "Build a repeatable stop, aim, shoot sequence.",
    steps: [
      "Open a practice map with bots. Choose one rifle and keep your setup fixed.",
      "Stop moving before each single shot. Reset your aim between targets.",
      "Count clean first-shot hits out of 20 attempts. Record the count, not a rating.",
    ],
    mistake: "Speeding up before the first shot is consistently controlled.",
  },
  {
    id: "movement",
    name: "Stop before you shoot",
    category: "Movement",
    level: "Beginner",
    minutes: 5,
    objective: "Separate movement from accurate firing.",
    steps: [
      "Use a local practice session and face a wall at a consistent distance.",
      "Strafe, release movement and practice stopping before one shot. Repeat in both directions.",
      "Inspect the impact grouping and note how often you fired before stopping.",
    ],
    mistake:
      "Holding the movement key while judging the accuracy of a standing shot.",
  },
  {
    id: "peeking",
    name: "One angle at a time",
    category: "Positioning",
    level: "Intermediate",
    minutes: 5,
    objective: "Reduce exposure to multiple angles.",
    steps: [
      "Choose one approach to a bombsite in a local practice session.",
      "Walk through the route, pausing to name each new angle before exposing it.",
      "Repeat at normal movement speed and note where you exposed two angles at once.",
    ],
    mistake:
      "Practicing a route without considering where a defender could be.",
  },
  {
    id: "utility",
    name: "Repeat a verified throw",
    category: "Utility",
    level: "Intermediate",
    minutes: 5,
    objective: "Make one useful grenade repeatable.",
    steps: [
      "Choose a lineup you have personally verified on the current map version.",
      "Record the starting landmark, aim point and throw technique.",
      "Repeat five times and record successful landings. Recheck after map updates.",
    ],
    mistake:
      "Trusting an old video without testing its landing in the current game.",
  },
  {
    id: "recoil",
    name: "Controlled bursts",
    category: "Aim",
    level: "Beginner",
    minutes: 5,
    objective: "Observe how your weapon behaves over short bursts.",
    steps: [
      "Pick a fixed distance and one rifle in local practice.",
      "Fire short bursts at the same marked area, waiting for recovery between bursts.",
      "Compare ten attempts and record the burst length you could control.",
    ],
    mistake:
      "Changing distance, burst length and sensitivity at the same time.",
  },
  {
    id: "trading",
    name: "Trade with a partner",
    category: "Teamplay",
    level: "Intermediate",
    minutes: 5,
    objective: "Plan a route that lets a teammate respond to contact.",
    steps: [
      "In a private practice session, choose a route and a partner.",
      "Take turns leading; the second player watches the angle that can engage the leader.",
      "Discuss spacing and sightlines after each attempt. Record one adjustment.",
    ],
    mistake:
      "Following so closely that both players are exposed to the same burst.",
  },
  {
    id: "review",
    name: "Review one decision",
    category: "Decision-making",
    level: "All levels",
    minutes: 5,
    objective: "Turn one remembered round into a specific next action.",
    steps: [
      "Choose one round you can review or clearly recall.",
      "Write what you knew at the time, the decision you made and one plausible alternative.",
      "Pick a controllable behavior to try next match. Separate hindsight from information you had.",
    ],
    mistake: "Judging a decision only by whether you won the round.",
  },
  {
    id: "communication",
    name: "Short, useful calls",
    category: "Teamplay",
    level: "Beginner",
    minutes: 5,
    objective: "Practice communicating observed information.",
    steps: [
      "With a partner, describe a location, what you saw and when you saw it.",
      "Distinguish confirmed information from a guess.",
      "Review five example calls and remove unnecessary words without losing context.",
    ],
    mistake: "Presenting an assumption as confirmed enemy information.",
  },
];
export const FOCUS = [
  "Aim",
  "Movement",
  "Positioning",
  "Utility",
  "Teamplay",
  "Decision-making",
];
