import { PodcastVoiceGender } from "@/lib/types";

export const openAiVoices: Record<PodcastVoiceGender, string[]> = {
  female: ["alloy", "sage", "coral"],
  male: ["verse", "ash", "ballad"]
};

export const allOpenAiVoices = [...openAiVoices.female, ...openAiVoices.male];

