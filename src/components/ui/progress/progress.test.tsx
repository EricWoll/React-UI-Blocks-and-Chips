import { describe, it, expect, afterEach, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import Progress from "./progress.components";

describe("Progress", () => {
  const setup = (overides = {}) => {
    let value = 0;
    const utils = render(<Progress value={value} {...overides} />);

    const progressDisplay = screen.getByTestId("progress-display");

    return {
      progressDisplay,
      rerender: utils.rerender,
    };
  };

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("renders progres bar", () => {
    const { progressDisplay } = setup({
      value: 10,
    });
    expect(progressDisplay).toBeInTheDocument();
    expect(progressDisplay).toHaveStyle({ width: "10%" });
  });

  it("updates width when value changes", () => {
    const { progressDisplay, rerender } = setup({
      value: 10,
    });
    expect(progressDisplay).toHaveStyle({ width: "10%" });

    rerender(<Progress value={20} />);
    expect(progressDisplay).toHaveStyle({ width: "20%" });
  });

  it("respects custom max value", () => {
    render(<Progress value={50} max={200} />);

    const bar = screen.getByTestId("progress-display");

    expect(bar).toHaveStyle({ width: "25%" });
  });

  it("handles zero value", () => {
    render(<Progress value={0} />);

    expect(screen.getByTestId("progress-display")).toHaveStyle({
      width: "0%",
    });
  });

  it("Clamps to max when over max values", () => {
    render(<Progress value={200} max={100} />);

    expect(screen.getByTestId("progress-display")).toHaveStyle({
      width: "100%",
    });
  });

  it("Clamps to zero when negative values", () => {
    render(<Progress value={-10} />);

    expect(screen.getByTestId("progress-display")).toHaveStyle({
      width: "0%",
    });
  });

  it("Rounds with floating point values", () => {
    render(<Progress value={33.333333333} />);

    expect(screen.getByTestId("progress-display")).toHaveStyle({
      width: "33.33%",
    });
  });
});
