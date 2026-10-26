import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { Pagination } from "@/components/common/pagination";

const basePagination = {
  page: 2,
  limit: 10,
  total: 35,
  totalPages: 4,
};

describe("Pagination", () => {
  it("shows the current result range", () => {
    render(<Pagination pagination={basePagination} onPageChange={vi.fn()} itemLabel="patient" />);

    expect(screen.getByText("Showing 11–20 of 35 patients")).toBeInTheDocument();
    expect(screen.getByText("Page 2 of 4")).toBeInTheDocument();
  });

  it("navigates to the previous and next page", async () => {
    const user = userEvent.setup();
    const onPageChange = vi.fn();
    render(
      <Pagination pagination={basePagination} onPageChange={onPageChange} itemLabel="patient" />,
    );

    await user.click(screen.getByRole("button", { name: "Next page" }));
    expect(onPageChange).toHaveBeenLastCalledWith(3);

    await user.click(screen.getByRole("button", { name: "Previous page" }));
    expect(onPageChange).toHaveBeenLastCalledWith(1);
  });

  it("disables navigation at the boundaries", () => {
    const { rerender } = render(
      <Pagination
        pagination={{ ...basePagination, page: 1 }}
        onPageChange={vi.fn()}
        itemLabel="patient"
      />,
    );

    expect(screen.getByRole("button", { name: "Previous page" })).toBeDisabled();

    rerender(
      <Pagination
        pagination={{ ...basePagination, page: 4 }}
        onPageChange={vi.fn()}
        itemLabel="patient"
      />,
    );

    expect(screen.getByRole("button", { name: "Next page" })).toBeDisabled();
  });
});
