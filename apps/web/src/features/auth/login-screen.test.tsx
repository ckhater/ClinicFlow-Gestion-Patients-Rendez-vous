import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { LoginScreen } from "@/features/auth/login-screen";

const mocks = vi.hoisted(() => ({
  login: vi.fn(),
  replace: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: mocks.replace, push: vi.fn() }),
  usePathname: () => "/login",
}));

vi.mock("@/features/auth/auth-provider", () => ({
  useAuth: () => ({
    user: null,
    isLoading: false,
    isAuthenticated: false,
    login: mocks.login,
    logout: vi.fn(),
  }),
}));

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe("LoginScreen", () => {
  beforeEach(() => {
    mocks.login.mockReset();
    mocks.replace.mockReset();
  });

  it("shows validation errors for an empty submission", async () => {
    const user = userEvent.setup();
    render(<LoginScreen />);

    await user.click(screen.getByRole("button", { name: /sign in/i }));

    expect(await screen.findByText("Email is required")).toBeInTheDocument();
    expect(await screen.findByText("Password is required")).toBeInTheDocument();
    expect(mocks.login).not.toHaveBeenCalled();
  });

  it("submits normalized credentials and redirects", async () => {
    const user = userEvent.setup();
    mocks.login.mockResolvedValue({
      id: "11111111-1111-4111-8111-111111111111",
      fullName: "Amina Benali",
      email: "admin@clinicflow.dev",
      role: "admin",
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    });

    render(<LoginScreen />);

    await user.type(screen.getByLabelText("Email address"), "  ADMIN@ClinicFlow.dev ");
    await user.type(screen.getByLabelText("Password"), "Admin123!");
    await user.click(screen.getByRole("button", { name: /sign in/i }));

    expect(mocks.login).toHaveBeenCalledWith({
      email: "admin@clinicflow.dev",
      password: "Admin123!",
    });
    expect(mocks.replace).toHaveBeenCalledWith("/dashboard");
  });

  it("toggles password visibility", async () => {
    const user = userEvent.setup();
    render(<LoginScreen />);

    const password = screen.getByLabelText("Password");
    expect(password).toHaveAttribute("type", "password");

    await user.click(screen.getByRole("button", { name: "Show password" }));
    expect(password).toHaveAttribute("type", "text");

    await user.click(screen.getByRole("button", { name: "Hide password" }));
    expect(password).toHaveAttribute("type", "password");
  });
});
