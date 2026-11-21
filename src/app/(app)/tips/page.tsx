import Link from "next/link";

export const metadata = { title: "Keto notes" };

const tips = [
  {
    title: "Keto flu",
    body: "Headache, fatigue, and cramps in the first week are common while sodium and water shift. Eat salty food, drink water, and ease training for a few days. If symptoms are severe, stop and call your doctor.",
  },
  {
    title: "Electrolytes",
    body: "Many keto plans aim for roughly 3 to 5 grams of sodium, potassium from food such as avocado and spinach, and a magnesium supplement in the 200 to 400 mg range. Those are discussion points for your clinician, not a prescription.",
  },
  {
    title: "Water",
    body: "The daily log uses 100 oz as a visible target. More is not automatically better. Pale urine and no dizziness is a practical check.",
  },
  {
    title: "Fasting timer",
    body: "16, 18, and 20 hour timers are on the log page. Skip fasting if you are ill, pregnant, or your doctor has told you not to. End the timer if you feel shaky or unwell.",
  },
];

export default function TipsPage() {
  return (
    <div className="mx-auto grid max-w-2xl gap-4">
      <header>
        <p className="text-sm font-semibold uppercase tracking-[0.16em] text-saffron">Notes</p>
        <h1 className="font-display text-4xl">Keto flu and electrolytes</h1>
        <p className="mt-2 text-sm leading-6 text-muted">
          Not medical advice. Use this as a checklist to take to your doctor.
        </p>
      </header>
      {tips.map((tip) => (
        <article key={tip.title} className="rounded-3xl border border-line bg-paper p-4">
          <h2 className="font-display text-2xl">{tip.title}</h2>
          <p className="mt-2 text-sm leading-6">{tip.body}</p>
        </article>
      ))}
      <Link href="/log" className="text-sm font-semibold text-moss">
        Back to the log
      </Link>
    </div>
  );
}
