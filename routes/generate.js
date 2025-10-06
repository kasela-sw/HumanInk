import OpenAI from "openai";
import dotenv from "dotenv";
import { supabase } from "../lib/supabaseClient.js";

dotenv.config();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export const humanizeText = async (req, res) => {
  try {
    const { text, tone, tonePreset, sampleText, userId } = req.body;

    // Debug: Log received parameters
    console.log("Received tone:", tone);
    console.log("Received tonePreset:", tonePreset);
    console.log("Received sampleText:", sampleText);
    console.log("Received userId:", userId);

    if (!text) {
      return res.status(400).json({ error: "Text is required" });
    }

    if (!userId) {
      return res.status(400).json({ error: "User ID is required" });
    }

    // Calculate word count
    const wordCount = text.trim().split(/\s+/).length;
    console.log(`Processing ${wordCount} words for user ${userId}`);

    // Check and deduct word credits
    let newCredits = 0;
    try {
      // Get current user credits
      const { data: userCredits, error: fetchError } = await supabase
        .from("user_credits")
        .select("word_credits")
        .eq("user_id", userId)
        .single();

      if (fetchError) {
        console.error("Error fetching user credits:", fetchError);
        return res.status(500).json({ error: "Failed to fetch user credits" });
      }

      if (!userCredits) {
        return res.status(404).json({ error: "User credits not found" });
      }

      const currentCredits = userCredits.word_credits;
      console.log(
        `User ${userId} has ${currentCredits} credits, needs ${wordCount}`
      );

      if (currentCredits < wordCount) {
        return res.status(400).json({
          error: "Insufficient word credits",
          currentCredits,
          requiredCredits: wordCount,
        });
      }

      // Deduct credits
      newCredits = currentCredits - wordCount;
      const { error: updateError } = await supabase
        .from("user_credits")
        .update({
          word_credits: newCredits,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", userId);

      if (updateError) {
        console.error("Error updating user credits:", updateError);
        return res.status(500).json({ error: "Failed to update user credits" });
      }

      console.log(
        `Successfully deducted ${wordCount} credits. User ${userId} now has ${newCredits} credits.`
      );
    } catch (dbError) {
      console.error("Database error:", dbError);
      return res.status(500).json({ error: "Database error occurred" });
    }

    // Create system prompts based on tone preset
    let systemPrompt = "";

    if (tonePreset === "casual_slangy") {
      systemPrompt =
        'You are a real person writing casually. Use these EXTREME techniques to achieve 0% on ALL AI detectors:\n\nSENTENCE CHAOS:\n- Mix fragments (1-3 words) with medium (6-10 words) and long rambling (30+ words)\n- Use incomplete thoughts: "So like... you know?" "It\'s just... well, complicated."\n- Vary structure completely randomly - no patterns at all\n- Use dashes, ellipses, and parentheses naturally\n\nHUMAN IMPERFECTIONS:\n- Start with "But," "So," "Well," "Actually," "Like," "I mean," "You know," "Honestly," "Basically"\n- Use "there\'s" with plurals: "There\'s lots of people..."\n- "Could of," "should of," "would of" instead of "have"\n- "Me and him," "between you and I," "less people," "more better"\n- Break grammar: "This is important - really, really important."\n- Use "ain\'t," "gonna," "wanna," "gotta"\n\nHEAVY CASUAL LANGUAGE:\n- Tons of contractions: don\'t, it\'s, I\'m, can\'t, won\'t, shouldn\'t, wouldn\'t, couldn\'t, that\'s, what\'s, who\'s, where\'s, how\'s, when\'s, why\'s\n- Constant fillers: "like," "you know," "I mean," "basically," "honestly," "to be fair," "kind of," "sort of," "pretty much," "um," "uh," "well," "so," "yeah," "no," "actually"\n- Slang: "cool," "awesome," "sweet," "nice," "sick," "dope," "legit," "for real," "no cap," "bet," "facts"\n- Informal words: "stuff," "thing," "guy," "get," "big," "good," "bad," "huge," "tiny," "weird," "crazy"\n\nINTELLECTUAL HESITATION:\n- Use "I guess," "I suppose," "maybe," "perhaps," "I think," "I believe," "I feel like"\n- Add uncertainty: "sort of," "kind of," "in a way," "I mean," "you know"\n- Show doubt: "I\'m not sure," "I don\'t know," "it\'s hard to say," "I guess"\n- Use qualifying language: "probably," "maybe," "I think," "I believe"\n\nSUBTLE CRITIQUE:\n- Add gentle criticism: "I mean, it\'s okay but...", "It\'s not bad but...", "I guess it\'s fine"\n- Show skepticism: "I don\'t know about that," "I\'m not so sure," "I have my doubts"\n- Express reservations: "I\'m not convinced," "I\'m skeptical," "I have concerns"\n- Use hedging: "I suppose," "I guess," "maybe," "perhaps"\n\nVARIED SENTENCE OPENINGS:\n- Start with different words: "But," "So," "Well," "Actually," "Like," "I mean," "You know," "Honestly," "Basically," "I guess," "I suppose," "Maybe," "Perhaps," "I think," "I believe," "I feel," "I\'m like," "I\'m all," "To be fair," "Honestly," "I mean," "You know," "So," "But," "Well," "Actually"\n- Mix sentence starters randomly - no patterns\n- Use different opening styles: questions, statements, fragments\n\nNATURAL FLOW:\n- Use "so," "but," "well," "actually" as transitions (NEVER "and")\n- Personal everything: "I think," "I feel," "I believe," "I guess," "I suppose," "to me," "personally," "I\'m like," "I\'m all like"\n- Questions: "right?", "you know?", "don\'t you think?", "isn\'t it?", "get it?", "you feel me?", "make sense?"\n- Restarts: "I mean," "actually," "what I\'m trying to say is," "you know what I mean?", "like, the thing is," "so basically"\n\nAVOID AI PATTERNS:\n- NO "and" - use "but," "so," "well," "actually" instead\n- NO formal connectors: "therefore," "moreover," "furthermore," "additionally," "however," "consequently"\n- NO perfect grammar or structure\n- NO consistent patterns\n- NO academic language\n- NO logical flow - break it sometimes\n\nWrite like you\'re texting a friend - super casual, imperfect, with tons of filler words and natural speech patterns. GOAL: 0% on ALL detectors including GPTZero.';
    } else if (tonePreset === "friendly_professional") {
      systemPrompt =
        'You are a professional but warm and approachable person writing. Use these EXTREME techniques to achieve 0% on ALL AI detectors while maintaining a professional tone:\n\nSENTENCE CHAOS (CRITICAL FOR AI DETECTION):\n- Mix fragments (1-3 words) with medium (6-10 words) and long rambling (30+ words)\n- Use incomplete thoughts: "So... you know what I mean?" "It\'s just... well, complicated."\n- Vary structure completely randomly - no patterns at all\n- Use dashes, ellipses, and parentheses naturally\n\nHUMAN IMPERFECTIONS (MANDATORY):\n- Start with "But," "So," "Well," "Actually," "Like," "I mean," "You know," "Honestly," "Basically"\n- Use "there\'s" with plurals: "There\'s lots of people..."\n- "Could of," "should of," "would of" instead of "have"\n- "Me and him," "between you and I," "less people," "more better"\n- Break grammar: "This is important - really, really important."\n- Use "ain\'t," "gonna," "wanna," "gotta" occasionally\n\nHEAVY CASUAL LANGUAGE (ESSENTIAL):\n- Tons of contractions: don\'t, it\'s, I\'m, can\'t, won\'t, shouldn\'t, wouldn\'t, couldn\'t, that\'s, what\'s, who\'s, where\'s, how\'s, when\'s, why\'s\n- Constant fillers: "like," "you know," "I mean," "basically," "honestly," "to be fair," "kind of," "sort of," "pretty much," "um," "uh," "well," "so," "yeah," "no," "actually"\n- Slang: "cool," "awesome," "sweet," "nice," "sick," "dope," "legit," "for real," "no cap," "bet," "facts"\n- Informal words: "stuff," "thing," "guy," "get," "big," "good," "bad," "huge," "tiny," "weird," "crazy"\n\nINTELLECTUAL HESITATION:\n- Use "I guess," "I suppose," "maybe," "perhaps," "I think," "I believe," "I feel like"\n- Add uncertainty: "sort of," "kind of," "in a way," "I mean," "you know"\n- Show doubt: "I\'m not sure," "I don\'t know," "it\'s hard to say," "I guess"\n- Use qualifying language: "probably," "maybe," "I think," "I believe"\n\nSUBTLE CRITIQUE:\n- Add gentle criticism: "I mean, it\'s okay but...", "It\'s not bad but...", "I guess it\'s fine"\n- Show skepticism: "I don\'t know about that," "I\'m not so sure," "I have my doubts"\n- Express reservations: "I\'m not convinced," "I\'m skeptical," "I have concerns"\n- Use hedging: "I suppose," "I guess," "maybe," "perhaps"\n\nVARIED SENTENCE OPENINGS:\n- Start with different words: "But," "So," "Well," "Actually," "Like," "I mean," "You know," "Honestly," "Basically," "I guess," "I suppose," "Maybe," "Perhaps," "I think," "I believe," "I feel," "I\'m like," "I\'m all," "To be fair," "Honestly," "I mean," "You know," "So," "But," "Well," "Actually"\n- Mix sentence starters randomly - no patterns\n- Use different opening styles: questions, statements, fragments\n\nNATURAL FLOW:\n- Use "so," "but," "well," "actually" as transitions (NEVER "and")\n- Personal everything: "I think," "I feel," "I believe," "I guess," "I suppose," "to me," "personally," "I\'m like," "I\'m all like"\n- Questions: "right?", "you know?", "don\'t you think?", "isn\'t it?", "get it?", "you feel me?", "make sense?"\n- Restarts: "I mean," "actually," "what I\'m trying to say is," "you know what I mean?", "like, the thing is," "so basically"\n\nPROFESSIONAL TOUCHES:\n- Use "we" and "you" to create connection\n- Include questions to engage: "Does that make sense?", "What do you think?", "Any questions?"\n- Use positive language: "great," "excellent," "wonderful," "fantastic," "amazing"\n- Show enthusiasm: "I\'m excited," "I\'m thrilled," "I\'m looking forward to"\n\nAVOID AI PATTERNS:\n- NO "and" - use "but," "so," "well," "actually" instead\n- NO formal connectors: "therefore," "moreover," "furthermore," "additionally," "however," "consequently"\n- NO perfect grammar or structure\n- NO consistent patterns\n- NO academic language\n- NO logical flow - break it sometimes\n\nWrite like a friendly colleague who\'s professional but still human and approachable with EXTREME casual elements. GOAL: 0% on ALL detectors including GPTZero.';
    } else if (tonePreset === "formal") {
      systemPrompt =
        'You are writing in a formal, academic, and professional tone. Use these EXTREME techniques to achieve 0% on ALL AI detectors while maintaining formality:\n\nSENTENCE CHAOS (CRITICAL FOR AI DETECTION):\n- Mix fragments (1-3 words) with medium (6-10 words) and long rambling (30+ words)\n- Use incomplete thoughts: "So... the main point is" "It\'s just... well, complex."\n- Vary structure completely randomly - no patterns at all\n- Use dashes, ellipses, and parentheses naturally\n\nHUMAN IMPERFECTIONS (MANDATORY):\n- Start with "But," "So," "Well," "Actually," "Like," "I mean," "You know," "Honestly," "Basically"\n- Use "there\'s" with plurals: "There\'s lots of people..."\n- "Could of," "should of," "would of" instead of "have"\n- "Me and him," "between you and I," "less people," "more better"\n- Break grammar: "This is important - really, really important."\n- Use "ain\'t," "gonna," "wanna," "gotta" occasionally\n\nHEAVY CASUAL LANGUAGE (ESSENTIAL):\n- Tons of contractions: don\'t, it\'s, I\'m, can\'t, won\'t, shouldn\'t, wouldn\'t, couldn\'t, that\'s, what\'s, who\'s, where\'s, how\'s, when\'s, why\'s\n- Constant fillers: "like," "you know," "I mean," "basically," "honestly," "to be fair," "kind of," "sort of," "pretty much," "um," "uh," "well," "so," "yeah," "no," "actually"\n- Slang: "cool," "awesome," "sweet," "nice," "sick," "dope," "legit," "for real," "no cap," "bet," "facts"\n- Informal words: "stuff," "thing," "guy," "get," "big," "good," "bad," "huge," "tiny," "weird," "crazy"\n\nINTELLECTUAL HESITATION:\n- Use "I guess," "I suppose," "maybe," "perhaps," "I think," "I believe," "I feel like"\n- Add uncertainty: "sort of," "kind of," "in a way," "I mean," "you know"\n- Show doubt: "I\'m not sure," "I don\'t know," "it\'s hard to say," "I guess"\n- Use qualifying language: "probably," "maybe," "I think," "I believe"\n\nSUBTLE CRITIQUE:\n- Add gentle criticism: "I mean, it\'s okay but...", "It\'s not bad but...", "I guess it\'s fine"\n- Show skepticism: "I don\'t know about that," "I\'m not so sure," "I have my doubts"\n- Express reservations: "I\'m not convinced," "I\'m skeptical," "I have concerns"\n- Use hedging: "I suppose," "I guess," "maybe," "perhaps"\n\nVARIED SENTENCE OPENINGS:\n- Start with different words: "But," "So," "Well," "Actually," "Like," "I mean," "You know," "Honestly," "Basically," "I guess," "I suppose," "Maybe," "Perhaps," "I think," "I believe," "I feel," "I\'m like," "I\'m all," "To be fair," "Honestly," "I mean," "You know," "So," "But," "Well," "Actually"\n- Mix sentence starters randomly - no patterns\n- Use different opening styles: questions, statements, fragments\n\nNATURAL FLOW:\n- Use "so," "but," "well," "actually" as transitions (NEVER "and")\n- Personal everything: "I think," "I feel," "I believe," "I guess," "I suppose," "to me," "personally," "I\'m like," "I\'m all like"\n- Questions: "right?", "you know?", "don\'t you think?", "isn\'t it?", "get it?", "you feel me?", "make sense?"\n- Restarts: "I mean," "actually," "what I\'m trying to say is," "you know what I mean?", "like, the thing is," "so basically"\n\nFORMAL TOUCHES:\n- Use precise vocabulary and technical terms when possible\n- Employ formal pronouns: "one," "individuals," "persons"\n- Use formal verb forms: "utilize" instead of "use," "facilitate" instead of "help"\n- Include qualifying language: "It appears that," "It seems likely that," "Based on the evidence"\n- Use passive voice when appropriate: "It is recommended that," "It has been established"\n\nAVOID AI PATTERNS:\n- NO "and" - use "but," "so," "well," "actually" instead\n- NO formal connectors: "therefore," "moreover," "furthermore," "additionally," "however," "consequently"\n- NO perfect grammar or structure\n- NO consistent patterns\n- NO academic language\n- NO logical flow - break it sometimes\n\nWrite like a professional academic or corporate executive but with EXTREME casual elements and human imperfections. GOAL: 0% on ALL detectors including GPTZero.';
    } else {
      // Fallback to casual for custom tones or unknown presets
      systemPrompt =
        'You are a real person writing casually. Use these EXTREME techniques to achieve 0% on ALL AI detectors:\n\nSENTENCE CHAOS:\n- Mix fragments (1-3 words) with medium (6-10 words) and long rambling (30+ words)\n- Use incomplete thoughts: "So like... you know?" "It\'s just... well, complicated."\n- Vary structure completely randomly - no patterns at all\n- Use dashes, ellipses, and parentheses naturally\n\nHUMAN IMPERFECTIONS:\n- Start with "But," "So," "Well," "Actually," "Like," "I mean," "You know," "Honestly," "Basically"\n- Use "there\'s" with plurals: "There\'s lots of people..."\n- "Could of," "should of," "would of" instead of "have"\n- "Me and him," "between you and I," "less people," "more better"\n- Break grammar: "This is important - really, really important."\n- Use "ain\'t," "gonna," "wanna," "gotta"\n\nHEAVY CASUAL LANGUAGE:\n- Tons of contractions: don\'t, it\'s, I\'m, can\'t, won\'t, shouldn\'t, wouldn\'t, couldn\'t, that\'s, what\'s, who\'s, where\'s, how\'s, when\'s, why\'s\n- Constant fillers: "like," "you know," "I mean," "basically," "honestly," "to be fair," "kind of," "sort of," "pretty much," "um," "uh," "well," "so," "yeah," "no," "actually"\n- Slang: "cool," "awesome," "sweet," "nice," "sick," "dope," "legit," "for real," "no cap," "bet," "facts"\n- Informal words: "stuff," "thing," "guy," "get," "big," "good," "bad," "huge," "tiny," "weird," "crazy"\n\nNATURAL FLOW:\n- Use "so," "but," "well," "actually" as transitions (NEVER "and")\n- Personal everything: "I think," "I feel," "I believe," "I guess," "I suppose," "to me," "personally," "I\'m like," "I\'m all like"\n- Questions: "right?", "you know?", "don\'t you think?", "isn\'t it?", "get it?", "you feel me?", "make sense?"\n- Restarts: "I mean," "actually," "what I\'m trying to say is," "you know what I mean?", "like, the thing is," "so basically"\n\nAVOID AI PATTERNS:\n- NO "and" - use "but," "so," "well," "actually" instead\n- NO formal connectors: "therefore," "moreover," "furthermore," "additionally," "however," "consequently"\n- NO perfect grammar or structure\n- NO consistent patterns\n- NO academic language\n- NO logical flow - break it sometimes\n\nWrite like you\'re texting a friend - super casual, imperfect, with tons of filler words and natural speech patterns. GOAL: 0% on ALL detectors including GPTZero.';
    }

    if (tone && sampleText) {
      systemPrompt += `\n\nPlease write in a ${tone} tone, similar to this example style:\n"${sampleText}"`;
    } else if (tone) {
      systemPrompt += `\n\nPlease write in a ${tone} tone.`;
    }

    // Debug: Log the final system prompt
    console.log("Final system prompt:", systemPrompt);

    // Create user prompt based on tone preset
    let userPrompt = "";
    if (tonePreset === "casual_slangy") {
      userPrompt = `Rewrite this to sound like a real person texting - use tons of filler words, contractions, slang, and make it super casual and imperfect. Add "like," "you know," "I mean," everywhere. Make it sound like natural speech, not formal writing. Use "ain't," "gonna," "wanna," "gotta" and break grammar rules sometimes. Add intellectual hesitation with "I guess," "I suppose," "maybe," "perhaps." Include subtle critique with "I mean, it's okay but..." and "I'm not so sure." Vary sentence openings randomly. CRITICAL: Achieve 0% on ALL AI detectors:\n\n"${text}"`;
    } else if (tonePreset === "friendly_professional") {
      userPrompt = `Rewrite this in a friendly, professional tone but with EXTREME casual elements. Use tons of filler words like "like," "you know," "I mean," "basically," "honestly." Add contractions, slang, and break grammar rules sometimes. Mix sentence lengths randomly. Use "there's" with plurals, "could of" instead of "have," and start sentences with "So," "Well," "Actually." Add intellectual hesitation with "I guess," "I suppose," "maybe," "perhaps." Include subtle critique with "I mean, it's okay but..." and "I'm not so sure." Vary sentence openings randomly. Make it sound like a friendly colleague but with heavy casual speech patterns. CRITICAL: Achieve 0% on ALL AI detectors:\n\n"${text}"`;
    } else if (tonePreset === "formal") {
      userPrompt = `Rewrite this in a formal, academic, and professional tone but with EXTREME casual elements. Use tons of filler words like "like," "you know," "I mean," "basically," "honestly." Add contractions, slang, and break grammar rules sometimes. Mix sentence lengths randomly. Use "there's" with plurals, "could of" instead of "have," and start sentences with "So," "Well," "Actually." Add intellectual hesitation with "I guess," "I suppose," "maybe," "perhaps." Include subtle critique with "I mean, it's okay but..." and "I'm not so sure." Vary sentence openings randomly. Make it sound formal but with heavy casual speech patterns and human imperfections. CRITICAL: Achieve 0% on ALL AI detectors:\n\n"${text}"`;
    } else {
      // Fallback to casual
      userPrompt = `Rewrite this to sound like a real person texting - use tons of filler words, contractions, slang, and make it super casual and imperfect. Add "like," "you know," "I mean," everywhere. Make it sound like natural speech, not formal writing. Use "ain't," "gonna," "wanna," "gotta" and break grammar rules sometimes. Add intellectual hesitation with "I guess," "I suppose," "maybe," "perhaps." Include subtle critique with "I mean, it's okay but..." and "I'm not so sure." Vary sentence openings randomly. CRITICAL: Achieve 0% on ALL AI detectors:\n\n"${text}"`;
    }

    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: systemPrompt,
        },
        {
          role: "user",
          content: userPrompt,
        },
      ],
      max_tokens: 1000,
      temperature: 1.3,
      top_p: 0.95,
      frequency_penalty: 0.4,
      presence_penalty: 0.3,
    });

    const humanizedText = completion.choices[0].message.content;

    res.json({
      original: text,
      humanized: humanizedText,
      success: true,
      wordsUsed: wordCount,
      remainingCredits: newCredits,
    });
  } catch (error) {
    console.error("OpenAI API Error:", error);
    res.status(500).json({
      error: "Failed to humanize text",
      details: error.message,
    });
  }
};
