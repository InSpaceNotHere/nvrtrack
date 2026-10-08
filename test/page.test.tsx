import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import Home from "@/app/page";
import type { ContentPack } from "@/lib/content";

const livePack: ContentPack = {
  socialPosts: ["Live one", "Live two", "Live three"],
  email: { subject: "Live subject", body: "Live body" },
  videoScript: "Live script",
  detailsToConfirm: ["Confirm the offer end date"],
};

beforeEach(() => {
  Object.defineProperty(navigator, "clipboard", {
    configurable: true,
    value: { writeText: vi.fn().mockResolvedValue(undefined) },
  });
  Object.defineProperty(URL, "createObjectURL", {
    configurable: true,
    value: vi.fn(() => "blob:test"),
  });
  Object.defineProperty(URL, "revokeObjectURL", {
    configurable: true,
    value: vi.fn(),
  });
  vi.stubGlobal("fetch", vi.fn());
  vi.spyOn(window, "confirm").mockReturnValue(true);
});

describe("portfolio workbench", () => {
  it("switches and resets local samples without calling AI", async () => {
    const user = userEvent.setup();
    render(<Home />);

    expect(
      screen.getByText("Choose an example. Review the drafts. Edit and copy."),
    ).toBeVisible();
    const handyman = screen.getByRole("button", { name: "Handyman" });
    await user.click(handyman);
    expect(handyman).toHaveAttribute("aria-pressed", "true");
    expect(screen.queryByText(/loaded locally/i)).not.toBeInTheDocument();
    expect(
      (screen.getByLabelText("Social post 1") as HTMLTextAreaElement).value,
    ).toContain("Small fixes");

    await user.click(screen.getByRole("button", { name: "Event services" }));
    expect(
      (screen.getByLabelText("Social post 1") as HTMLTextAreaElement).value,
    ).toContain("strong event plan");
    expect(fetch).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: "Reset" }));
    expect(screen.queryByLabelText("Social post 1")).not.toBeInTheDocument();
    expect(screen.getByText(/choose a prepared example/i)).toBeVisible();
  });

  it("marks drafts stale and keeps harmless HTML as editable text", async () => {
    const user = userEvent.setup();
    render(<Home />);
    await user.click(screen.getByRole("button", { name: "Handyman" }));
    await user.type(screen.getByLabelText(/Business name/), " updated");
    expect(screen.getByText(/drafts stale/i)).toBeVisible();

    const post = screen.getByLabelText("Social post 1");
    await user.clear(post);
    await user.type(post, '<img src=x onerror="alert(1)">');
    expect(post).toHaveValue('<img src=x onerror="alert(1)">');
    expect(document.querySelector('img[src="x"]')).toBeNull();
  });

  it("copies and downloads the latest edits including email subject", async () => {
    const user = userEvent.setup();
    const writeText = vi.spyOn(navigator.clipboard, "writeText");
    let downloaded: Blob | undefined;
    vi.mocked(URL.createObjectURL).mockImplementation((blob) => {
      downloaded = blob as Blob;
      return "blob:test";
    });
    render(<Home />);
    await user.click(screen.getByRole("button", { name: "Handyman" }));

    const post = screen.getByLabelText("Social post 1");
    await user.clear(post);
    await user.type(post, "Edited latest post");
    await user.click(screen.getAllByRole("button", { name: "Copy" })[0]);
    expect(writeText).toHaveBeenLastCalledWith("Edited latest post");

    await user.click(screen.getByRole("tab", { name: "Email" }));
    const subject = screen.getByLabelText("Subject");
    await user.clear(subject);
    await user.type(subject, "Edited subject");
    await user.click(screen.getByRole("button", { name: "Copy all" }));
    expect(writeText).toHaveBeenLastCalledWith(
      expect.stringContaining("Subject: Edited subject"),
    );

    await user.click(screen.getByRole("button", { name: "Download all" }));
    expect(URL.createObjectURL).toHaveBeenCalledOnce();
    expect(downloaded).toBeDefined();
    const text = await downloaded!.text();
    expect(text).toContain("Edited latest post");
    expect(text).toContain("Subject: Edited subject");
    await waitFor(() => expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:test"));
  });

  it("ignores a late live response after sample switching", async () => {
    const user = userEvent.setup();
    let resolveFetch!: (response: Response) => void;
    vi.mocked(fetch).mockReturnValue(
      new Promise<Response>((resolve) => {
        resolveFetch = resolve;
      }),
    );
    render(<Home />);
    await user.click(screen.getByRole("button", { name: "Handyman" }));
    await user.click(screen.getByRole("button", { name: "Generate content" }));
    expect(screen.getByRole("button", { name: "Generating…" })).toBeDisabled();

    await user.click(screen.getByRole("button", { name: "Fitness coach" }));
    resolveFetch(
      new Response(JSON.stringify({ pack: livePack }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );
    await waitFor(() =>
      expect(
        (screen.getByLabelText("Social post 1") as HTMLTextAreaElement).value,
      ).toContain("Stop guessing"),
    );
    expect(screen.queryByDisplayValue("Live one")).not.toBeInTheDocument();
  });

  it("never substitutes a sample when custom generation fails", async () => {
    const user = userEvent.setup();
    vi.mocked(fetch).mockResolvedValue(
      new Response(
        JSON.stringify({
          error: "Live generation is not configured. Add a provider key.",
        }),
        { status: 503, headers: { "content-type": "application/json" } },
      ),
    );
    render(<Home />);
    await user.type(screen.getByLabelText(/Business name/), "Custom Co");
    await user.type(
      screen.getByLabelText(/Business facts/),
      "Fictional copy service in Denver.",
    );
    await user.type(screen.getByLabelText(/Target audience/), "Denver teams");
    await user.type(screen.getByLabelText(/Topic or offer/), "Copy review");
    await user.click(screen.getByRole("button", { name: "Generate content" }));

    expect(await screen.findByText(/not configured/i)).toBeVisible();
    expect(screen.queryByLabelText("Social post 1")).not.toBeInTheDocument();
    expect(screen.getByLabelText(/Business name/)).toHaveValue("Custom Co");
  });
});
