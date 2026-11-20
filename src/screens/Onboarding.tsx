import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useCreateHabits, useToday, useUpdateProfile } from "../data/hooks";
import { browserTimeZone } from "../lib/dates";
import { CROP_TYPES, type CropType } from "../game/crops";
import { HeroIsland } from "../art/Hero";
import { CropPicker, ErrorNote } from "../components/ui";

const SUGGESTIONS = ["Drink water", "Read 10 pages", "Stretch", "Walk outside", "Journal", "Meditate"];

interface Draft {
  name: string;
  crop: CropType;
}

export function Onboarding() {
  const [step, setStep] = useState(0);
  const [farmName, setFarmName] = useState("");
  const [yourName, setYourName] = useState("");
  const [drafts, setDrafts] = useState<Draft[]>([{ name: "", crop: "carrot" }]);
  const today = useToday();
  const createHabits = useCreateHabits();
  const updateProfile = useUpdateProfile();

  const validDrafts = drafts.filter((d) => d.name.trim());
  const busy = createHabits.isPending || updateProfile.isPending;

  function setDraft(i: number, patch: Partial<Draft>) {
    setDrafts((ds) => ds.map((d, j) => (j === i ? { ...d, ...patch } : d)));
  }

  function addSuggestion(name: string) {
    const empty = drafts.findIndex((d) => !d.name.trim());
    if (empty >= 0) setDraft(empty, { name });
    else if (drafts.length < 3) setDrafts([...drafts, { name, crop: CROP_TYPES[drafts.length % CROP_TYPES.length] }]);
  }

  async function finish() {
    try {
      // Only plant once, even if saving the profile fails and the user retries.
      if (!createHabits.isSuccess) {
        await createHabits.mutateAsync(
          validDrafts.map((d, i) => ({ name: d.name.trim(), crop_type: d.crop, plot_index: i, cycle_started_on: today })),
        );
      }
      await updateProfile.mutateAsync({
        farm_name: farmName.trim(),
        display_name: yourName.trim() || null,
        timezone: browserTimeZone(),
      });
    } catch {
      // shown through the mutations' error state
    }
  }

  return (
    <div className="welcome">
      <HeroIsland pose={step === 2 ? "wave" : step === 1 ? "plant" : "idle"} plotCount={step === 0 ? 0 : step === 1 ? 3 : 7} />
      <div className="page narrow">
        <div className="steps" aria-label={`Step ${step + 1} of 3`}>
          {[0, 1, 2].map((i) => (
            <span key={i} className={`step-dot${i <= step ? " on" : ""}`} />
          ))}
        </div>
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            className="card stack"
            initial={{ x: 30, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -30, opacity: 0 }}
            transition={{ duration: 0.25 }}
          >
            {step === 0 && (
              <form
                className="stack"
                onSubmit={(e) => {
                  e.preventDefault();
                  setStep(1);
                }}
              >
                <h2>Name your island</h2>
                <p className="muted">A small piece of land, floating above the clouds. What will you call it?</p>
                <div className="field">
                  <label htmlFor="farm">Island name</label>
                  <input id="farm" className="input" required maxLength={40} placeholder="Willowmere" value={farmName} onChange={(e) => setFarmName(e.target.value)} />
                </div>
                <div className="field">
                  <label htmlFor="you">What should we call you? (optional)</label>
                  <input id="you" className="input" maxLength={40} placeholder="Sam" value={yourName} onChange={(e) => setYourName(e.target.value)} />
                </div>
                <button className="btn" disabled={!farmName.trim()}>
                  Next
                </button>
              </form>
            )}

            {step === 1 && (
              <div className="stack">
                <h2>Plant your first habits</h2>
                <p className="muted">Start small: one to three things you'd like to do every day. You can add more later.</p>
                <div className="row">
                  {SUGGESTIONS.map((s) => (
                    <button key={s} type="button" className="chip" onClick={() => addSuggestion(s)}>
                      + {s}
                    </button>
                  ))}
                </div>
                {drafts.map((d, i) => (
                  <div key={i} className="draft">
                    <div className="row">
                      <input
                        className="input"
                        aria-label={`Habit ${i + 1}`}
                        placeholder="A daily habit…"
                        maxLength={60}
                        value={d.name}
                        onChange={(e) => setDraft(i, { name: e.target.value })}
                        style={{ flex: 1 }}
                      />
                      {drafts.length > 1 && (
                        <button type="button" className="btn ghost small" onClick={() => setDrafts(drafts.filter((_, j) => j !== i))}>
                          Remove
                        </button>
                      )}
                    </div>
                    <CropPicker value={d.crop} onChange={(crop) => setDraft(i, { crop })} size={44} />
                  </div>
                ))}
                {drafts.length < 3 && (
                  <button type="button" className="btn ghost small" onClick={() => setDrafts([...drafts, { name: "", crop: CROP_TYPES[drafts.length] }])}>
                    + Another habit
                  </button>
                )}
                <div className="row between">
                  <button type="button" className="btn ghost" onClick={() => setStep(0)}>
                    Back
                  </button>
                  <button type="button" className="btn" disabled={validDrafts.length === 0} onClick={() => setStep(2)}>
                    Next
                  </button>
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="stack">
                <h2>Meet the wanderer</h2>
                <p>
                  {yourName.trim() ? `Hello, ${yourName.trim()}! ` : ""}A quiet wanderer tends <strong>{farmName}</strong>, but can only work when you show up.
                </p>
                <ul className="rules">
                  <li>🌱 Each day you complete a habit, the wanderer tends its plot: planting, watering, pulling weeds.</li>
                  <li>❤️ Each plot has three hearts. A missed day costs a heart and lets a weed in. Showing up restores one.</li>
                  <li>🥀 If a plot runs out of hearts, the crop wilts away. You can always replant.</li>
                  <li>🧺 After 21 days of care, a crop is ripe for harvest and goes into your pantry.</li>
                  <li>🛌 Need a break? Take one rest day a week per habit, and the plot is tucked in safely.</li>
                </ul>
                <ErrorNote error={createHabits.error ?? updateProfile.error} />
                <div className="row between">
                  <button type="button" className="btn ghost" onClick={() => setStep(1)}>
                    Back
                  </button>
                  <button type="button" className="btn sage" disabled={busy} onClick={finish}>
                    {busy ? "Opening the gate…" : "Start farming"}
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
