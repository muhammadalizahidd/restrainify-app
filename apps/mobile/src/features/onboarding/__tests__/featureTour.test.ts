import { TOUR_RECAP, TOUR_SLIDES } from "../tour/tourContent";

describe("feature tour content", () => {
  it("covers the six home-screen protections in the home grid's order", () => {
    const order = ["Site Blocker", "Explicit Content Filter", "In-App Blocker", "App Limits", "Settings Lock", "Uninstall Lock"];
    expect(TOUR_SLIDES.map((slide) => slide.feature)).toEqual(order);
    expect(TOUR_RECAP.map((item) => item.name)).toEqual(order);
  });

  it("gives every slide a try hint and a result hint", () => {
    for (const slide of TOUR_SLIDES) {
      expect(slide.tryHint.length).toBeGreaterThan(0);
      expect(slide.doneHint.length).toBeGreaterThan(0);
    }
  });
});
