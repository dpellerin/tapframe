import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { DisplayManifest } from "@/lib/display/types";
import { AdminApp } from "./admin-app";

const fraimic: DisplayManifest = {
  id: "fraimic",
  name: "Fraimic",
  description: "Local frame",
  sizes: [
    {
      id: "standard",
      width: 1600,
      height: 1200,
      label: "Standard · 1600 × 1200",
    },
  ],
  fields: [
    {
      key: "host",
      label: "Frame address",
      type: "text",
      placeholder: "fraimic.local",
    },
  ],
  layout: { maxPerRow: 4, rows: 1 },
};

function mockFetch() {
  return vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input);
    if (url.includes("/api/display")) {
      return new Response(JSON.stringify({ settings: {} }), { status: 200 });
    }
    if (url.includes("/api/logos")) {
      return new Response(JSON.stringify({ logos: [] }), { status: 200 });
    }
    return new Response("{}", { status: 200 });
  });
}

describe("AdminApp", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("renders tap editors in a left-to-right row that does not stretch", () => {
    render(
      <AdminApp
        initialTaps={[
          {
            name: "Helles",
            style: "Lager",
            abv: 4.8,
            description: "Crisp and easy.",
            logo: "logos/helles.png",
          },
          {
            name: "House Pale",
            style: "Pale Ale",
            abv: 5.4,
            description: "Citrus, not bitter.",
          },
        ]}
      />,
    );

    expect(screen.getByDisplayValue("Helles")).toBeInTheDocument();
    expect(screen.getByDisplayValue("House Pale")).toBeInTheDocument();
    expect(screen.getByLabelText("Headline")).toBeInTheDocument();
    expect(screen.getByLabelText("Line under")).toBeInTheDocument();
    const row = screen.getByDisplayValue("Helles").closest("section");
    expect(row?.className).toContain("justify-center");
    expect(screen.getByDisplayValue("Helles").closest("article")?.className).toContain(
      "w-52",
    );
  });

  it("opens display settings in a dialog and closes on save", async () => {
    const user = userEvent.setup();
    vi.stubGlobal("fetch", mockFetch());
    render(
      <AdminApp
        initialTaps={[
          {
            name: "Helles",
            style: "Lager",
            abv: 4.8,
            description: "Crisp.",
          },
        ]}
        initialDisplay={{
          adapter: "fraimic",
          size: "standard",
          fields: { host: "fraimic.local" },
        }}
        displays={[fraimic]}
      />,
    );

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Settings" }));

    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByLabelText("Display")).toBeInTheDocument();
    expect(within(dialog).getByLabelText("Size")).toBeInTheDocument();
    expect(within(dialog).getByLabelText("Frame address")).toHaveValue(
      "fraimic.local",
    );
    expect(within(dialog).getByText("4 across · 1 row")).toBeInTheDocument();

    await user.click(within(dialog).getByRole("button", { name: "Save" }));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("discards display edits if the dialog is cancelled", async () => {
    const user = userEvent.setup();
    vi.stubGlobal("fetch", mockFetch());
    render(
      <AdminApp
        initialTaps={[
          {
            name: "Helles",
            style: "Lager",
            abv: 4.8,
            description: "Crisp.",
          },
        ]}
        initialDisplay={{
          adapter: "fraimic",
          size: "standard",
          fields: { host: "fraimic.local" },
        }}
        displays={[fraimic]}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Settings" }));
    await user.clear(screen.getByLabelText("Frame address"));
    await user.type(screen.getByLabelText("Frame address"), "192.168.1.20");
    await user.click(screen.getByRole("button", { name: "Cancel" }));

    await user.click(screen.getByRole("button", { name: "Settings" }));
    expect(screen.getByLabelText("Frame address")).toHaveValue("fraimic.local");
  });

  it("hides add once the selected display is full", () => {
    render(
      <AdminApp
        initialTaps={Array.from({ length: 2 }, (_, index) => ({
          name: `Beer ${index + 1}`,
          style: "Ale",
          abv: 5,
          description: "Notes.",
        }))}
        initialDisplay={{
          adapter: "small",
          size: "standard",
          fields: {},
        }}
        displays={[
          {
            ...fraimic,
            id: "small",
            name: "Small",
            layout: { maxPerRow: 2, rows: 1 },
          },
        ]}
      />,
    );

    expect(screen.getAllByRole("article")).toHaveLength(2);
    expect(screen.queryByRole("button", { name: "Add a tap" })).toBeNull();
  });

  it("places the preview size above the image well", () => {
    render(
      <AdminApp
        initialTaps={[
          {
            name: "Helles",
            style: "Lager",
            abv: 4.8,
            description: "Crisp.",
          },
        ]}
      />,
    );

    expect(screen.queryByTestId("preview-size")).not.toBeInTheDocument();
    expect(
      screen.getByText("Generate a preview to see the menu."),
    ).toBeInTheDocument();
  });
});
