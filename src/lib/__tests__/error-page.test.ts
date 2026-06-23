import { describe, it, expect } from "vitest";
import { renderErrorPage } from "../error-page";

describe("renderErrorPage", () => {
  const html = renderErrorPage();

  it("returns a valid HTML document", () => {
    expect(html).toContain("<!doctype html>");
    expect(html).toContain("<html");
    expect(html).toContain("</html>");
  });

  it("includes the error title", () => {
    expect(html).toContain("<title>This page didn't load</title>");
  });

  it("includes a heading with the error message", () => {
    expect(html).toContain("This page didn't load");
  });

  it("includes a retry button", () => {
    expect(html).toContain("Try again");
    expect(html).toContain("location.reload()");
  });

  it("includes a go-home link", () => {
    expect(html).toContain('href="/"');
    expect(html).toContain("Go home");
  });

  it("contains responsive viewport meta tag", () => {
    expect(html).toContain('name="viewport"');
    expect(html).toContain("width=device-width");
  });

  it("includes inline styles for self-contained rendering", () => {
    expect(html).toContain("<style>");
    expect(html).toContain("</style>");
  });
});
