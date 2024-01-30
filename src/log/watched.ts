import { getMovie, Input, Number, prompt } from "../deps.ts";
import { Entry } from "../schemas.ts";
import { getCurrentDate } from "../utils.ts";
import { z } from "zod";

const movieOrTVSchema = z.object({
  title: z.string(),
  season: z.number().optional(),
  date: z.string().transform((value) =>
    new Date(value).toISOString().split("T")[0]
  ),
  rating: z.number().max(5).min(1),
});

export async function logMovieOrTv(
  logType: Entry["type"],
): Promise<Entry> {
  const currentDate = getCurrentDate();

  const movieOrTVPrompt = await prompt([
    {
      name: "title",
      message: "What did you watch?",
      type: Input,
    },
    {
      name: "season",
      message: "Which season?",
      type: Number,
      before: async (_, next) => {
        if (logType === "tv") {
          await next();
        } else {
          await next("date");
        }
      },
    },
    {
      name: "date",
      message: "When did you watch it? (YYYY-MM-DD)",
      suggestions: [currentDate],
      type: Input,
    },
    {
      name: "rating",
      message: "How many stars? (1-5)",
      type: Number,
      min: 1,
      max: 5,
    },
  ]);

  const { title, season, rating, date } = movieOrTVSchema.parse(
    movieOrTVPrompt,
  );

  const options = {
    api: Deno.env.get("OMDB_API") ?? "",
    titleOrId: title,
  };

  const entry = await getMovie(options);

  if (logType === "movie") {
    return {
      type: "movie",
      title: entry.Title,
      date,
      genres: entry.Genre.split(", "),
      release_year: parseInt(entry.Year),
      review: { rating },
      director: entry.Director.split(", "),
    };
  }

  return {
    type: "tv",
    title: entry.Title,
    date,
    genres: entry.Genre.split(", "),
    release_year: parseInt(entry.Year) ?? null,
    review: { rating },
    season: season ?? 0,
    director: entry.Director.split(", "),
  };
}
