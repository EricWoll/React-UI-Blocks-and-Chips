import { describe, it, expect, afterEach, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import SearchBar from "./searchbar.components";

describe("SearchBar", () => {
  const setup = (overrides = {}) => {
    const setSearchTerm = vi.fn();
    const onSearch = vi.fn();
    const onClear = vi.fn();

    render(
      <SearchBar
        searchTerm=""
        setSearchTerm={setSearchTerm}
        onSearch={onSearch}
        onClear={onClear}
        {...overrides}
      />,
    );

    const input = screen.getByLabelText("search input") as HTMLInputElement;

    return {
      input,
      setSearchTerm,
      onSearch,
      onClear,
    };
  };

  afterEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
  });

  it("renders input", () => {
    const { input } = setup();

    expect(input).toBeInTheDocument();
  });

  it("updates search term when typing", () => {
    const { input, setSearchTerm } = setup();
    fireEvent.change(input, { target: { value: "hello" } });

    expect(setSearchTerm).toHaveBeenCalled();
  });

  it("does not auto search empty value when disallowed", () => {
    const { input, onSearch } = setup({
      autoSearch: { isAutoSearch: true, allowEmptySearch: false },
    });

    input.value = "   ";
    input.dispatchEvent(new Event("input", { bubbles: true }));


    expect(onSearch).not.toHaveBeenCalled();
  });

  it("triggers search on Enter key", () => {
    const { input, onSearch } = setup({
      searchTerm: "abc",
      autoSearch: { allowKeyPress: true, allowEmptySearch: true },
    });

    fireEvent.keyDown(input, { key: "Enter", code: "Enter" });

    expect(onSearch).toHaveBeenCalledWith("abc");
  });

  it("triggers search when search icon is clicked", async () => {
    const { onSearch } = setup({
      searchTerm: "clickTest",
    });

    const icon = screen.getByLabelText("search icon");
    fireEvent.click(icon);

    expect(onSearch).toHaveBeenCalledWith("clickTest");
  });

  it("clears input and calls onClear", () => {
    const setSearchTerm = vi.fn();
    const onClear = vi.fn();

    render(
      <SearchBar
        searchTerm="value"
        setSearchTerm={setSearchTerm}
        onSearch={vi.fn()}
        onClear={onClear}
      />,
    );

    const button = screen.getByLabelText("search clear button");

    fireEvent.click(button);

    expect(setSearchTerm).toHaveBeenCalledWith("");
    expect(onClear).toHaveBeenCalled();
  });

  it("does not render clear button when empty", () => {
    render(
      <SearchBar searchTerm="" setSearchTerm={vi.fn()} onSearch={vi.fn()} />,
    );

    const button = screen.queryByLabelText("search clear button");

    expect(button).not.toBeInTheDocument();
  });
});
