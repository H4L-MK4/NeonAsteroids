import { AIResponse } from "../types";

// Static data to simulate AI responses for offline/self-hosted mode
const BRIEFINGS = [
  "Intelligence reports a massive debris field entering the sector. Your primary objective is survival. Prioritize evasion over engagement if hull integrity drops below 50%.",
  "Pirate mining drones have destabilized the local asteroid belt. Navigate the chaos and clear the path for the supply convoy. Watch for erratic rock movements.",
  "Deep space sensors detect high-density ore clusters masked by a magnetic storm. Engage thrusters with caution; inertial dampeners are fluctuating.",
  "Command has authorized a live-fire exercise in the Alpha Centauri training zone. Targets are simulated but the impact damage is real. Good hunting, pilot.",
  "A rogue comet has shattered a nearby moon. The gravitational wake is pulling fragments into shipping lanes. Clear the sector immediately.",
  "We are tracking a class-4 asteroid storm. Energy readings suggest unstable isotopes within the rock structure. Destroy them before they impact the station."
];

const FACTS = [
  {
    text: "Ceres is the largest object in the asteroid belt between Mars and Jupiter, comprising 25% of the belt's total mass.",
    sources: [{ title: "NASA Solar System", uri: "https://science.nasa.gov/solar-system/asteroids/ceres/" }]
  },
  {
    text: "Asteroids are leftovers from the early formation of our solar system about 4.6 billion years ago.",
    sources: [{ title: "Space.com", uri: "https://www.space.com/51-asteroids-formation-discovery-and-exploration.html" }]
  },
  {
    text: "The Psyche asteroid appears to be the exposed nickel-iron core of an early planet, one of the building blocks of our solar system.",
    sources: [{ title: "Arizona State University", uri: "https://psyche.asu.edu/" }]
  },
  {
    text: "Most asteroids are irregularly shaped because they do not have enough gravity to pull themselves into the shape of a ball.",
    sources: [{ title: "ESA Kids", uri: "https://www.esa.int/kids/en/learn/Our_Universe/Comets_and_meteors/Asteroids" }]
  },
  {
    text: "A car-sized asteroid hits Earth's atmosphere about once a year, creating an impressive fireball but rarely causing damage.",
    sources: [{ title: "JPL Asteroid Watch", uri: "https://www.jpl.nasa.gov/asteroid-watch" }]
  }
];

// Simulate async delay for realism
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const getMissionBriefing = async (topic: string): Promise<string> => {
  await delay(800); // Simulate network request
  return BRIEFINGS[Math.floor(Math.random() * BRIEFINGS.length)];
};

export const getDailySpaceFact = async (): Promise<AIResponse> => {
  await delay(600);
  const fact = FACTS[Math.floor(Math.random() * FACTS.length)];
  return {
    text: fact.text,
    sources: fact.sources
  };
};

export const analyzePerformance = async (score: number, accuracy: number): Promise<string> => {
  await delay(1000);
  
  if (score > 10000) {
    return `Exceptional piloting detected. Score of ${score} places you in the top percentile of the fleet. Precision rating: ${accuracy}%. Recommendation: Assignment to elite squadron.`;
  } else if (score > 5000) {
    return `Solid performance. Score: ${score}. Your targeting systems show ${accuracy}% efficiency. Continue drills to improve reaction times against class-4 fragmented heavy rocks.`;
  } else if (score > 1000) {
    return `Cadet-level telemetry recorded. Score: ${score}. Hull integrity was compromised early. Accuracy (${accuracy}%) suggests hesitation. recalibrate targeting sensors.`;
  } else {
    return `Critical mission failure. Score: ${score}. Telemetry indicates panic firing with only ${accuracy}% accuracy. Simulator reboot required immediately.`;
  }
};
