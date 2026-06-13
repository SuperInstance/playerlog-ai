/**
 * Gaming coach module — VOD review, weakness analysis, decision coaching, mental game tips.
 */

// ─── VOD Review Prompts ─────────────────────────────────────────────────────

export class VODReviewPrompts {
  /** Generate structured VOD review prompts for a game session. */
  static forSession(session: { game: string; result: string; character?: string; kills?: number; deaths?: number; assists?: number; notes: string }): string[] {
    const prompts: string[] = [];
    const { game, result, character, kills, deaths, assists, notes } = session;

    prompts.push(`Review this ${game} session where you played ${character ?? 'unknown'} and got a ${result}.`);
    prompts.push(`What were the key turning points in this match?`);

    if (kills !== undefined && deaths !== undefined) {
      const kda = deaths > 0 ? ((kills ?? 0) / deaths).toFixed(1) : 'perfect';
      prompts.push(`Your KDA was ${kda} (${kills}/${deaths}/${assists ?? 0}). Were there deaths that could have been avoided with better positioning?`);
    }

    if (result === 'loss') {
      prompts.push(`What was the single biggest factor in this loss?`);
      prompts.push(`Identify one specific mechanic to practice based on this game.`);
    } else {
      prompts.push(`What did you do well this game that you should replicate?`);
    }

    if (notes) {
      prompts.push(`Your notes: "${notes}". What patterns do you notice?`);
    }

    return prompts;
  }

  /** Prompts focused on early-game decisions. */
  static earlyGameFocus(game: string): string[] {
    return [
      `Analyze your opening strategy in ${game}. Are you maximizing early resource gain?`,
      `Compare your first 3 minutes to the meta opening. Where do you deviate?`,
      `Are you trading efficiently in the laning phase?`,
    ];
  }

  /** Prompts focused on teamfight/mid-game. */
  static midGameFocus(game: string): string[] {
    return [
      `In ${game} teamfights, are you targeting the right priorities?`,
      `Review your rotation timing. Are you arriving to fights too early or too late?`,
      `How is your map awareness during the mid-game? Track missed information.`,
    ];
  }
}

// ─── Weakness Finder ────────────────────────────────────────────────────────

export interface Weakness {
  category: 'positioning' | 'economy' | 'mechanics' | 'game_sense' | 'teamplay';
  severity: 'high' | 'medium' | 'low';
  description: string;
  evidence: string;
  suggestion: string;
}

export class WeaknessFinder {
  /** Analyze session history to surface recurring weaknesses. */
  static analyze(sessions: { result: string; kills?: number; deaths?: number; assists?: number; durationMin: number; notes: string }[]): Weakness[] {
    const weaknesses: Weakness[] = [];
    if (sessions.length < 3) return weaknesses;

    const losses = sessions.filter(s => s.result === 'loss');
    const totalDeaths = sessions.reduce((a, s) => a + (s.deaths ?? 0), 0);
    const avgDeaths = totalDeaths / sessions.length;
    const shortGames = sessions.filter(s => s.durationMin < sessions.reduce((a, x) => a + x.durationMin, 0) / sessions.length * 0.6);

    // High death rate → positioning/mechanics
    if (avgDeaths > 6) {
      weaknesses.push({
        category: 'positioning',
        severity: avgDeaths > 10 ? 'high' : 'medium',
        description: `Averaging ${avgDeaths.toFixed(1)} deaths per game`,
        evidence: `Across ${sessions.length} games, total deaths: ${totalDeaths}`,
        suggestion: 'Focus on survival positioning. Review death locations in replays and identify overextension patterns.',
      });
    }

    // Many short losses → early-game economy or aggression issue
    if (shortGames.length >= 3 && shortGames.filter(s => s.result === 'loss').length >= 2) {
      weaknesses.push({
        category: 'economy',
        severity: 'medium',
        description: 'Multiple games ending significantly faster than average',
        evidence: `${shortGames.length} short games out of ${sessions.length} total`,
        suggestion: 'Review early-game economy and resource management. Are you falling behind in gold/XP early?',
      });
    }

    // Low KDA spread → teamplay issue
    const avgKills = sessions.reduce((a, s) => a + (s.kills ?? 0), 0) / sessions.length;
    const avgAssists = sessions.reduce((a, s) => a + (s.assists ?? 0), 0) / sessions.length;
    if (avgAssists < 3 && avgKills > 5) {
      weaknesses.push({
        category: 'teamplay',
        severity: 'low',
        description: 'High kills but low assists — may be playing too independently',
        evidence: `Avg ${avgKills.toFixed(1)} kills, ${avgAssists.toFixed(1)} assists`,
        suggestion: 'Look for opportunities to enable teammates. Sometimes the best play is setting up a teammate rather than taking the kill.',
      });
    }

    // Win rate analysis
    const lossRate = losses.length / sessions.length;
    if (lossRate > 0.6 && sessions.length >= 5) {
      weaknesses.push({
        category: 'game_sense',
        severity: 'high',
        description: `Loss rate of ${(lossRate * 100).toFixed(0)}% over ${sessions.length} games`,
        evidence: `${losses.length} losses, ${sessions.length - losses.length} wins`,
        suggestion: 'Take a step back and review macro decisions. Focus on when to engage vs. when to rotate.',
      });
    }

    return weaknesses.sort((a, b) => (a.severity === 'high' ? 0 : a.severity === 'medium' ? 1 : 2) - (b.severity === 'high' ? 0 : b.severity === 'medium' ? 1 : 2));
  }
}

// ─── Decision Coach ─────────────────────────────────────────────────────────

export interface DecisionPoint {
  situation: string;
  options: string[];
  recommended: number;
  reasoning: string;
}

export class DecisionCoach {
  /** Generate coaching prompts for common in-game decisions. */
  static draftCoaching(game: string, metaCharacters: string[]): string {
    if (!metaCharacters.length) {
      return `Consider what compositions are strong in the current ${game} meta.`;
    }
    return `In the current ${game} meta, top picks are: ${metaCharacters.slice(0, 5).join(', ')}. Consider how your pick complements or counters these.`;
  }

  /** Analyze a specific decision described by the user. */
  static analyzeDecision(description: string): DecisionPoint {
    // Structured coaching framework — real implementation would use LLM
    return {
      situation: description,
      options: ['Play aggressively', 'Play defensively', 'Rotate to objective', 'Farm safely'],
      recommended: 2,
      reasoning: `Based on the described situation, prioritizing objective play tends to yield better outcomes. Review your team's resource state before committing.`,
    };
  }

  /** Post-match reflection questions. */
  static reflectionPrompts(result: 'win' | 'loss'): string[] {
    if (result === 'win') {
      return [
        'What was the decisive moment that swung the game in your favor?',
        'Did you adapt your build/playstyle based on the opponent?',
        'What would you do differently if you faced the same composition again?',
      ];
    }
    return [
      'At what point did the game start slipping away?',
      'Was there a decision you made that you knew was risky in the moment?',
      'What information did you lack that would have changed your play?',
      'What is one specific thing to practice before your next session?',
    ];
  }
}

// ─── Mental Game Tips ───────────────────────────────────────────────────────

export class MentalGameTips {
  private static readonly TIPS: { trigger: string; tip: string }[] = [
    { trigger: 'tilt', tip: 'Take a 10-minute break after 2 consecutive losses. Your decision-making degrades faster than you notice.' },
    { trigger: 'streak', tip: 'On a win streak? Stay humble, keep the same discipline. Complacency creates sloppy habits.' },
    { trigger: 'rank', tip: 'Focus on improving your play, not your rank. Rank is a lagging indicator of skill — it will follow.' },
    { trigger: 'loss', tip: 'After a tough loss, write down ONE thing you learned before queuing again. Turn losses into lessons.' },
    { trigger: 'warmup', tip: 'Warm up with 1-2 casual games or aim training before ranked. Cold starts cost MMR.' },
    { trigger: 'focus', tip: 'Play in blocks of 2-3 games max, then take a 5-minute break. Sustained focus degrades after ~90 minutes.' },
    { trigger: 'sleep', tip: 'Sleep deprivation cuts reaction time by 15-20%. Your mechanics are only as good as your rest.' },
    { trigger: 'review', tip: 'Review at least one replay per session. Active review accelerates improvement 3x over just playing.' },
  ];

  /** Get a relevant tip based on current context. */
  static getTip(context: string): string {
    const lower = context.toLowerCase();
    const match = MentalGameTips.TIPS.find(t => lower.includes(t.trigger));
    return match?.tip ?? MentalGameTips.TIPS[Math.floor(Math.random() * MentalGameTips.TIPS.length)].tip;
  }

  /** Get the full tip library. */
  static allTips(): { trigger: string; tip: string }[] {
    return [...MentalGameTips.TIPS];
  }
}
