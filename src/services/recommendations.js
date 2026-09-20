import { getRecommendationsForItem } from "@/services/db";

export const getRecommendations = async (item, count = 60) => {
  return getRecommendationsForItem(item, count);
};
