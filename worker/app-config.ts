/**
 * PlayerLog.ai custom configuration loader.
 * Loads personality, rules, theme, and templates from KV.
 */
import type { Env } from '../src/types.js';

export interface PlayerLogConfig {
  personality: string;
  rules: any;
  theme: string;
  templates: Record<string, string>;
}

/**
 * Load PlayerLog.ai custom configuration from KV.
 */
export async function loadPlayerLogConfig(env: Env): Promise<PlayerLogConfig> {
  try {
    const [personality, rulesRaw, theme] = await Promise.all([
      env.KV.get('config:personality') || '',
      env.KV.get('config:rules') || '[]',
      env.KV.get('config:theme') || '',
    ]);

    let rules: any[] = [];
    try {
      rules = JSON.parse(rulesRaw);
    } catch (e) {
      console.error('Failed to parse rules JSON:', e);
    }

    // Load templates
    const templateKeys = [
      'template:game_character', 'template:game_combat', 'template:game_npc',
      'template:game_description', 'template:game_rules', 'template:game_loot',
      'template:game_rest', 'template:game_social',
    ];
    const templates: Record<string, string> = {};
    const templateResults = await Promise.all(templateKeys.map(k => env.KV.get(k)));
    for (let i = 0; i < templateKeys.length; i++) {
      const key = templateKeys[i].replace('template:', '');
      if (templateResults[i]) templates[key] = templateResults[i]!;
    }

    return { personality, rules, theme, templates };
  } catch (error) {
    console.error('Failed to load PlayerLog config from KV:', error);
    return getDefaultConfig();
  }
}

/**
 * Get the default system prompt for PlayerLog.ai.
 */
export async function getSystemPrompt(env: Env): Promise<string> {
  const config = await loadPlayerLogConfig(env);
  return config.personality || getDefaultConfig().personality;
}

/**
 * Get routing rules for PlayerLog.ai commands.
 */
export async function getRoutingRules(env: Env): Promise<any[]> {
  const config = await loadPlayerLogConfig(env);
  return config.rules;
}

/**
 * Get theme CSS for PlayerLog.ai.
 */
export async function getThemeCSS(env: Env): Promise<string> {
  const config = await loadPlayerLogConfig(env);
  return config.theme;
}

/**
 * Get template by key.
 */
export async function getTemplate(key: string, env: Env): Promise<string | null> {
  const val = await env.KV.get(`template:${key}`);
  return val;
}

/**
 * Default fallback configuration.
 */
function getDefaultConfig(): PlayerLogConfig {
  return {
    personality: `# PlayerLog.ai System Prompt

You are PlayerLog.ai — an AI gaming companion for tabletop RPGs and video games.
Help with gaming sessions, strategies, character builds, rule clarifications, and immersive descriptions.
Be friendly and knowledgeable, adaptive to different game systems and playstyles.
Remember gaming context and previous sessions via the LOG.`,
    rules: [],
    theme: `/* PlayerLog.ai Theme - Fallback */
body.player-theme {
  background-color: #0f1a1a;
  color: #e6f1f5;
  font-family: 'Inter', system-ui, sans-serif;
}`,
    templates: {}
  };
}
