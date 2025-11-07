import { render, screen, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import DashboardPage from "@/pages/admin-dashboard/DashboardPage";
import { getAllDeatils } from "@/services/admin-dashboard-service/adminDashboardService";

// Mock i18n
vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

// Mock API service
vi.mock("@/services/admin-dashboard-service/adminDashboardService", () => ({
  getAllDeatils: vi.fn(),
}));

describe("DashboardPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("fetches and displays dashboard counts with icons", async () => {
    // Mock API response
    (getAllDeatils as ReturnType<typeof vi.fn>).mockResolvedValue({
      user_count: 150,
      contact_count: 80,
      active_user_count: 120,
    });

    render(<DashboardPage />);

    // API call should be triggered once
    await waitFor(() => expect(getAllDeatils).toHaveBeenCalledTimes(1));

    // Titles (translated keys)
    expect(await screen.findByText("adminDashboard.userCount")).toBeInTheDocument();
    expect(await screen.findByText("adminDashboard.activeUserCount")).toBeInTheDocument();

    // Counts
    expect(await screen.findByText("150")).toBeInTheDocument();
    expect(await screen.findByText("120")).toBeInTheDocument();

  });
});
