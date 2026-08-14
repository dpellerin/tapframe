import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { TapEditor, type TapDraft } from "./tap-editor";

const tap: TapDraft = {
  key: "1",
  name: "Helles",
  style: "Lager",
  abv: "4.8",
  description: "Crisp and easy.",
  logo: "logos/helles.png",
};

const noop = vi.fn();

describe("TapEditor", () => {
  it("sizes the logo as a capped share of the card, not the image's native pixels", () => {
    render(
      <TapEditor
        tap={tap}
        index={0}
        total={3}
        onChange={noop}
        onMove={noop}
        onRemove={noop}
        onError={noop}
      />,
    );

    const logo = screen.getByTestId("tap-logo");
    expect(logo.className).toContain("w-[44%]");
    expect(logo.className).toContain("aspect-square");
    expect(logo.className).toContain("min-w-24");
    expect(logo.className).toContain("max-w-36");
    expect(logo.className).toContain("overflow-hidden");

    const image = logo.querySelector("img");
    expect(image).not.toBeNull();
    expect(image?.className).toContain("absolute");
    expect(image?.className).toContain("object-cover");
    expect(image).not.toHaveAttribute("width");
    expect(image).not.toHaveAttribute("height");
  });

  it("does not let the field stack grow and open vertical gaps", () => {
    render(
      <TapEditor
        tap={{ ...tap, logo: undefined }}
        index={1}
        total={3}
        onChange={noop}
        onMove={noop}
        onRemove={noop}
        onError={noop}
      />,
    );

    const fields = screen.getByTestId("tap-fields");
    expect(fields.className).toContain("grid");
    expect(fields.className).not.toContain("flex-1");
    expect(screen.getByDisplayValue("Helles")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Lager")).toBeInTheDocument();
  });

  it("keeps reorder and remove as separate controls", () => {
    render(
      <TapEditor
        tap={tap}
        index={1}
        total={3}
        onChange={noop}
        onMove={noop}
        onRemove={noop}
        onError={noop}
      />,
    );

    expect(screen.getByRole("group", { name: "Reorder tap" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Move left" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Move right" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Remove" })).toBeInTheDocument();
  });

  it("asks before removing a tap", async () => {
    const user = userEvent.setup();
    const onRemove = vi.fn();
    render(
      <TapEditor
        tap={tap}
        index={0}
        total={2}
        onChange={noop}
        onMove={noop}
        onRemove={onRemove}
        onError={noop}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Remove" }));
    expect(onRemove).not.toHaveBeenCalled();
    expect(screen.getByRole("dialog", { name: "Remove Helles?" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onRemove).not.toHaveBeenCalled();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Remove" }));
    const dialog = screen.getByRole("dialog", { name: "Remove Helles?" });
    await user.click(within(dialog).getByRole("button", { name: "Remove" }));
    expect(onRemove).toHaveBeenCalledTimes(1);
  });

  it("keeps the description short until it is focused", async () => {
    const user = userEvent.setup();
    render(
      <TapEditor
        tap={tap}
        index={0}
        total={1}
        onChange={noop}
        onMove={noop}
        onRemove={noop}
        onError={noop}
      />,
    );

    const description = screen.getByRole("textbox", { name: "Description" });
    expect(description.tagName).toBe("TEXTAREA");
    expect(description).toHaveAttribute("rows", "2");

    await user.click(description);
    expect(description).toHaveAttribute("rows", "4");

    await user.tab();
    expect(description).toHaveAttribute("rows", "2");
  });

  it("lets you pick a logo already in the library", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <TapEditor
        tap={{ ...tap, logo: undefined }}
        index={0}
        total={1}
        onChange={onChange}
        onMove={noop}
        onRemove={noop}
        onError={noop}
        libraryLogos={["logos/house.png"]}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Choose logo" }));
    expect(screen.getByRole("dialog", { name: "Choose a logo" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Use house.png" }));
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ logo: "logos/house.png" }),
    );
    expect(screen.queryByRole("dialog", { name: "Choose a logo" })).not.toBeInTheDocument();
  });

  it("asks before deleting a library logo", async () => {
    const user = userEvent.setup();
    const onLibraryRemove = vi.fn();
    render(
      <TapEditor
        tap={tap}
        index={0}
        total={1}
        onChange={noop}
        onMove={noop}
        onRemove={noop}
        onError={noop}
        libraryLogos={["logos/house.png"]}
        onLibraryRemove={onLibraryRemove}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Choose logo" }));
    await user.click(screen.getByRole("button", { name: "Delete house.png" }));
    expect(onLibraryRemove).not.toHaveBeenCalled();

    const dialog = screen.getByRole("dialog", { name: "Delete this logo?" });
    await user.click(within(dialog).getByRole("button", { name: "Cancel" }));
    expect(onLibraryRemove).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: "Delete house.png" }));
    await user.click(
      within(screen.getByRole("dialog", { name: "Delete this logo?" })).getByRole(
        "button",
        { name: "Delete" },
      ),
    );
    expect(onLibraryRemove).toHaveBeenCalledWith("logos/house.png");
  });
});
