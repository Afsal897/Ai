import { render, screen } from "@testing-library/react";
import UserProfileImage from "@/components/user/UserProfileImage";
import { describe, expect, it } from "vitest";
import defaultAvatar from "@/assets/profileImage.png";

describe("UserProfileImage", () => {
  it("renders the image with the correct src, alt, and styles", () => {
    const previewUrl = "https://example.com/image.jpg";

    render(<UserProfileImage previewUrl={previewUrl} />);

    const image = screen.getByAltText("Preview") as HTMLImageElement;

    expect(image).toBeInTheDocument();
    expect(image.src).toBe(previewUrl);
    expect(image.alt).toBe("Preview");
    expect(image).toHaveAttribute("width", "150");
    expect(image).toHaveAttribute("height", "150");
    expect(image.className).toContain("object-fit-cover");
  });

  it("renders the image with passing null value", () => {
    render(<UserProfileImage previewUrl={null} />);

    const image = screen.getByAltText("Preview") as HTMLImageElement;

    expect(image).toBeInTheDocument();
    expect(image.src).toContain(defaultAvatar);
  });
});
