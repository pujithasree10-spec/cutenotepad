import OpenAI from 'openai';

// Helper to get the securely stored key from localStorage
const getApiKey = (): string | null => {
  return localStorage.getItem('LITTLE_PAGES_OPENAI_KEY');
};

export const breakdownTask = async (taskTitle: string, taskDescription?: string | null): Promise<string[]> => {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error('Please configure your OpenAI API Key in Settings first.');
  }

  const openai = new OpenAI({ apiKey, dangerouslyAllowBrowser: true });

  const prompt = `
    You are a productivity expert. Break down the following task into 3 to 5 highly actionable, small, and clear subtasks.
    Task: "${taskTitle}"
    Description: "${taskDescription || 'No description provided.'}"

    Return ONLY a JSON array of strings, where each string is a subtask. Do not return any other text, markdown formatting, or markdown code blocks (no \`\`\`json). Just the raw array.
    Example: ["Buy groceries", "Prepare ingredients", "Cook dinner"]
  `;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
    });

    const content = response.choices[0].message.content;
    if (!content) return [];
    
    // Parse the JSON array safely
    const subtasks: string[] = JSON.parse(content.trim());
    return subtasks;
  } catch (error: any) {
    console.error('AI Breakdown Error:', error);
    throw new Error(error.message || 'Failed to generate subtasks with AI.');
  }
};

export const getDailyCoachMessage = async (
  stats: { totalTasks: number; habitsCompleted: number; avgMood: number }
): Promise<string> => {
  const apiKey = getApiKey();
  if (!apiKey) {
    return 'Your AI Life Coach is sleeping. Add your OpenAI API Key in Settings to wake it up! ✨';
  }

  const openai = new OpenAI({ apiKey, dangerouslyAllowBrowser: true });

  const prompt = `
    You are a supportive, warm, and highly motivating Life Coach inside a Personal Life OS called "Little Pages".
    The user's stats for today are:
    - Tasks remaining/completed: ${stats.totalTasks}
    - Habits completed: ${stats.habitsCompleted}
    - Average mood over the last few days (1-5 scale): ${stats.avgMood.toFixed(1)}

    Write a short, engaging, and personalized 2-sentence motivational message for the user based on these stats. Keep it very cute and uplifting. Use 1 or 2 emojis.
  `;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
      max_tokens: 60,
    });

    return response.choices[0].message.content || 'You are doing amazing today! Keep shining. ✨';
  } catch (error) {
    console.error('AI Coach Error:', error);
    return 'Take a deep breath and keep going. You got this! ✨ (AI Error)';
  }
};
