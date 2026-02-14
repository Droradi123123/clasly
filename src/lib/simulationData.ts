// ===== Fake Data Generators for Simulation =====

const SAMPLE_WORDS = [
  'Amazing', 'Brilliant', 'Creative', 'Dynamic', 'Exciting',
  'Fantastic', 'Great', 'Happy', 'Innovative', 'Joyful',
  'Kind', 'Lovely', 'Magnificent', 'Nice', 'Outstanding',
  'Perfect', 'Quality', 'Remarkable', 'Super', 'Terrific',
  'Unique', 'Vibrant', 'Wonderful', 'Excellent', 'Zealous',
];

// Random integer between min and max (inclusive)
function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Generate a weighted random value (more likely to pick middle values)
function weightedRandom(min: number, max: number): number {
  const mid = (min + max) / 2;
  const range = max - min;
  // Use normal-ish distribution
  const u1 = Math.random();
  const u2 = Math.random();
  const normal = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  const value = mid + (normal * range * 0.2);
  return Math.round(Math.max(min, Math.min(max, value)));
}

// ===== Quiz Simulation =====
export function simulateQuizResponses(
  optionsCount: number,
  correctAnswer: number,
  targetVotes: number = 50,
  onUpdate: (results: number[], total: number) => void,
  duration: number = 3000
): () => void {
  const results = new Array(optionsCount).fill(0);
  let currentTotal = 0;
  let cancelled = false;
  
  const interval = duration / targetVotes;
  
  const tick = () => {
    if (cancelled || currentTotal >= targetVotes) return;
    
    // Bias towards correct answer (60% chance)
    const isCorrect = Math.random() < 0.6;
    const index = isCorrect ? correctAnswer : randomInt(0, optionsCount - 1);
    
    results[index]++;
    currentTotal++;
    
    onUpdate([...results], currentTotal);
    
    if (currentTotal < targetVotes) {
      setTimeout(tick, interval + randomInt(-20, 20));
    }
  };
  
  tick();
  
  return () => { cancelled = true; };
}

// ===== Poll Simulation =====
export function simulatePollResponses(
  optionsCount: number,
  targetVotes: number = 50,
  onUpdate: (results: number[], total: number) => void,
  duration: number = 3000
): () => void {
  const results = new Array(optionsCount).fill(0);
  let currentTotal = 0;
  let cancelled = false;
  
  // Create random "leader" for more exciting race
  const leader = randomInt(0, optionsCount - 1);
  const interval = duration / targetVotes;
  
  const tick = () => {
    if (cancelled || currentTotal >= targetVotes) return;
    
    // Leader has 40% chance, rest split evenly
    const isLeader = Math.random() < 0.4;
    const index = isLeader ? leader : randomInt(0, optionsCount - 1);
    
    results[index]++;
    currentTotal++;
    
    onUpdate([...results], currentTotal);
    
    if (currentTotal < targetVotes) {
      setTimeout(tick, interval + randomInt(-30, 30));
    }
  };
  
  tick();
  
  return () => { cancelled = true; };
}

// ===== Word Cloud Simulation =====
export function simulateWordCloud(
  targetWords: number = 30,
  onUpdate: (words: { text: string; count: number }[], total: number) => void,
  duration: number = 4000
): () => void {
  const wordCounts: Record<string, number> = {};
  let currentTotal = 0;
  let cancelled = false;
  
  const interval = duration / targetWords;
  
  const tick = () => {
    if (cancelled || currentTotal >= targetWords) return;
    
    // Pick a random word (with some repetition for popular words)
    const word = SAMPLE_WORDS[randomInt(0, Math.min(currentTotal + 5, SAMPLE_WORDS.length - 1))];
    wordCounts[word] = (wordCounts[word] || 0) + 1;
    currentTotal++;
    
    const wordsArray = Object.entries(wordCounts).map(([text, count]) => ({ text, count }));
    onUpdate(wordsArray, currentTotal);
    
    if (currentTotal < targetWords) {
      setTimeout(tick, interval + randomInt(-50, 100));
    }
  };
  
  tick();
  
  return () => { cancelled = true; };
}

// ===== Yes/No Simulation =====
export function simulateYesNo(
  targetVotes: number = 50,
  onUpdate: (results: { yes: number; no: number }, total: number) => void,
  duration: number = 3000
): () => void {
  const results = { yes: 0, no: 0 };
  let currentTotal = 0;
  let cancelled = false;
  
  // Random split (between 30-70%)
  const yesBias = 0.3 + Math.random() * 0.4;
  const interval = duration / targetVotes;
  
  const tick = () => {
    if (cancelled || currentTotal >= targetVotes) return;
    
    if (Math.random() < yesBias) {
      results.yes++;
    } else {
      results.no++;
    }
    currentTotal++;
    
    onUpdate({ ...results }, currentTotal);
    
    if (currentTotal < targetVotes) {
      setTimeout(tick, interval + randomInt(-20, 20));
    }
  };
  
  tick();
  
  return () => { cancelled = true; };
}

// ===== Scale Simulation =====
export function simulateScale(
  steps: number = 5,
  targetVotes: number = 50,
  onUpdate: (results: { average: number; distribution: number[] }, total: number) => void,
  duration: number = 3000
): () => void {
  const distribution = new Array(steps).fill(0);
  let currentTotal = 0;
  let cancelled = false;
  
  // Random "sweet spot" on the scale
  const sweetSpot = randomInt(2, steps - 1);
  const interval = duration / targetVotes;
  
  const tick = () => {
    if (cancelled || currentTotal >= targetVotes) return;
    
    // Use weighted random around sweet spot
    let value = weightedRandom(1, steps);
    // Bias towards sweet spot
    if (Math.random() < 0.4) {
      value = Math.max(1, Math.min(steps, sweetSpot + randomInt(-1, 1)));
    }
    
    distribution[value - 1]++;
    currentTotal++;
    
    // Calculate average
    const sum = distribution.reduce((acc, count, i) => acc + count * (i + 1), 0);
    const average = currentTotal > 0 ? sum / currentTotal : 0;
    
    onUpdate({ average, distribution: [...distribution] }, currentTotal);
    
    if (currentTotal < targetVotes) {
      setTimeout(tick, interval + randomInt(-20, 20));
    }
  };
  
  tick();
  
  return () => { cancelled = true; };
}

// ===== Guess Number Simulation =====
export function simulateGuessNumber(
  correctNumber: number,
  minRange: number,
  maxRange: number,
  targetVotes: number = 30,
  onUpdate: (results: { guesses: number[]; average: number; closestGuess: number }, total: number) => void,
  duration: number = 3000
): () => void {
  const guesses: number[] = [];
  let cancelled = false;
  
  const interval = duration / targetVotes;
  
  const tick = () => {
    if (cancelled || guesses.length >= targetVotes) return;
    
    // Generate guess around the correct number with some randomness
    const spread = (maxRange - minRange) * 0.3;
    let guess = correctNumber + randomInt(-spread, spread);
    guess = Math.round(Math.max(minRange, Math.min(maxRange, guess)));
    
    guesses.push(guess);
    
    const average = guesses.reduce((a, b) => a + b, 0) / guesses.length;
    const closestGuess = guesses.reduce((closest, g) => 
      Math.abs(g - correctNumber) < Math.abs(closest - correctNumber) ? g : closest
    , guesses[0]);
    
    onUpdate({ guesses: [...guesses], average, closestGuess }, guesses.length);
    
    if (guesses.length < targetVotes) {
      setTimeout(tick, interval + randomInt(-30, 50));
    }
  };
  
  tick();
  
  return () => { cancelled = true; };
}

// ===== Ranking Simulation =====
export function simulateRanking(
  items: string[],
  targetVotes: number = 20,
  onUpdate: (rankings: Record<string, number>) => void,
  duration: number = 3000
): () => void {
  const scores: Record<string, number> = {};
  items.forEach((item, i) => {
    scores[item] = items.length - i; // Initial order
  });
  
  let currentVote = 0;
  let cancelled = false;
  
  const interval = duration / targetVotes;
  
  const tick = () => {
    if (cancelled || currentVote >= targetVotes) return;
    
    // Randomly swap two adjacent items' scores
    const idx = randomInt(0, items.length - 2);
    const item1 = items[idx];
    const item2 = items[idx + 1];
    
    if (Math.random() < 0.5) {
      const temp = scores[item1];
      scores[item1] = scores[item2];
      scores[item2] = temp;
    }
    
    currentVote++;
    onUpdate({ ...scores });
    
    if (currentVote < targetVotes) {
      setTimeout(tick, interval);
    }
  };
  
  tick();
  
  return () => { cancelled = true; };
}

// ===== Sentiment Meter Simulation =====
export function simulateSentiment(
  targetVotes: number = 40,
  onUpdate: (results: { average: number; distribution: number[] }, total: number) => void,
  duration: number = 8000
): () => void {
  const distribution = new Array(10).fill(0);
  let currentTotal = 0;
  let cancelled = false;
  
  // Random "mood center" on the scale (0-100)
  const moodCenter = 30 + Math.random() * 40; // 30-70 range for variation
  const interval = duration / targetVotes;
  
  const tick = () => {
    if (cancelled || currentTotal >= targetVotes) return;
    
    // Generate sentiment value centered around moodCenter
    let value = moodCenter + (Math.random() - 0.5) * 60;
    value = Math.max(0, Math.min(100, value));
    
    // Map to bucket (0-9)
    const bucketIndex = Math.min(Math.floor(value / 10), 9);
    distribution[bucketIndex]++;
    currentTotal++;
    
    // Calculate average from distribution
    const totalValue = distribution.reduce((sum, count, i) => sum + count * (i * 10 + 5), 0);
    const average = currentTotal > 0 ? totalValue / currentTotal : 50;
    
    onUpdate({ average, distribution: [...distribution] }, currentTotal);
    
    if (currentTotal < targetVotes) {
      setTimeout(tick, interval + randomInt(-30, 30));
    }
  };
  
  tick();
  
  return () => { cancelled = true; };
}

// ===== Agree/Disagree Spectrum Simulation =====
export function simulateAgreeSpectrum(
  targetVotes: number = 40,
  onUpdate: (results: { positions: number[]; average: number; clusters: { position: number; count: number }[] }, total: number) => void,
  duration: number = 8000
): () => void {
  const positions: number[] = [];
  let cancelled = false;
  
  // Create 1-3 clusters for realistic group behavior
  const numClusters = randomInt(1, 3);
  const clusterCenters = Array.from({ length: numClusters }, () => randomInt(10, 90));
  const interval = duration / targetVotes;
  
  const tick = () => {
    if (cancelled || positions.length >= targetVotes) return;
    
    // Pick a random cluster and generate position around it
    const cluster = clusterCenters[randomInt(0, clusterCenters.length - 1)];
    let position = cluster + (Math.random() - 0.5) * 30;
    position = Math.max(0, Math.min(100, position));
    positions.push(Math.round(position));
    
    // Calculate average
    const average = positions.reduce((a, b) => a + b, 0) / positions.length;
    
    // Create clusters summary
    const clusters = clusterCenters.map(center => ({
      position: center,
      count: positions.filter(p => Math.abs(p - center) < 15).length,
    }));
    
    onUpdate({ positions: [...positions], average, clusters }, positions.length);
    
    if (positions.length < targetVotes) {
      setTimeout(tick, interval + randomInt(-30, 30));
    }
  };
  
  tick();
  
  return () => { cancelled = true; };
}

// ===== Finish Sentence Simulation =====
const SAMPLE_THEMES = [
  { theme: 'Positive Feedback', keywords: ['great', 'amazing', 'loved', 'helpful'] },
  { theme: 'Learning Insights', keywords: ['learned', 'understood', 'clarified', 'discovered'] },
  { theme: 'Suggestions', keywords: ['could', 'would be nice', 'perhaps', 'maybe'] },
  { theme: 'Engagement', keywords: ['interactive', 'fun', 'engaging', 'interesting'] },
];

export function simulateFinishSentence(
  targetResponses: number = 30,
  onUpdate: (results: { responses: { text: string; count: number }[]; clusters: { theme: string; keywords: string[]; count: number }[] }, total: number) => void,
  duration: number = 8000
): () => void {
  let currentTotal = 0;
  let cancelled = false;
  
  const clusterCounts = SAMPLE_THEMES.map(() => 0);
  const interval = duration / targetResponses;
  
  const tick = () => {
    if (cancelled || currentTotal >= targetResponses) return;
    
    // Pick a random theme and increment its count
    const themeIndex = randomInt(0, SAMPLE_THEMES.length - 1);
    clusterCounts[themeIndex]++;
    currentTotal++;
    
    // Create clusters result
    const clusters = SAMPLE_THEMES.map((theme, i) => ({
      theme: theme.theme,
      keywords: theme.keywords.slice(0, Math.min(clusterCounts[i], theme.keywords.length)),
      count: clusterCounts[i],
    })).filter(c => c.count > 0);
    
    onUpdate({ responses: [], clusters }, currentTotal);
    
    if (currentTotal < targetResponses) {
      setTimeout(tick, interval + randomInt(-50, 50));
    }
  };
  
  tick();
  
  return () => { cancelled = true; };
}
