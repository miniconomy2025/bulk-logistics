import { render, screen } from "@testing-library/react";
import { DashboardLayout } from "../../layouts/app-layout";

jest.mock("../../components/mobile-menu", () => {
    return function MockMobileMenu() {
        return <div data-testid="mobile-menu">Mobile Menu</div>;
    };
});

jest.mock("../../components/sidebar-menu", () => {
    return function MockSidebarMenu() {
        return <div data-testid="sidebar-menu">Sidebar Menu</div>;
    };
});

describe("DashboardLayout", () => {
    it("should render with children", () => {
        render(
            <DashboardLayout>
                <div data-testid="test-children">Test Content</div>
            </DashboardLayout>,
        );

        expect(screen.getByTestId("test-children")).toBeInTheDocument();
        expect(screen.getByText("Test Content")).toBeInTheDocument();
    });

    it("should render mobile menu", () => {
        render(
            <DashboardLayout>
                <div>Test Content</div>
            </DashboardLayout>,
        );

        expect(screen.getByTestId("mobile-menu")).toBeInTheDocument();
        expect(screen.getByText("Mobile Menu")).toBeInTheDocument();
    });

    it("should render sidebar menu", () => {
        render(
            <DashboardLayout>
                <div>Test Content</div>
            </DashboardLayout>,
        );

        expect(screen.getByTestId("sidebar-menu")).toBeInTheDocument();
        expect(screen.getByText("Sidebar Menu")).toBeInTheDocument();
    });

    it("should apply correct CSS classes to container", () => {
        render(
            <DashboardLayout>
                <div>Test Content</div>
            </DashboardLayout>,
        );

        const container = screen.getByTestId("mobile-menu").closest("div");
        expect(container).toHaveClass("font-inter", "block", "min-h-screen", "bg-gray-100", "lg:flex");
    });

    it("should render multiple children", () => {
        render(
            <DashboardLayout>
                <div data-testid="child-1">Child 1</div>
                <div data-testid="child-2">Child 2</div>
                <div data-testid="child-3">Child 3</div>
            </DashboardLayout>,
        );

        expect(screen.getByTestId("child-1")).toBeInTheDocument();
        expect(screen.getByTestId("child-2")).toBeInTheDocument();
        expect(screen.getByTestId("child-3")).toBeInTheDocument();
    });

    it("should handle empty children", () => {
        render(<DashboardLayout>{null}</DashboardLayout>);

        expect(screen.getByTestId("mobile-menu")).toBeInTheDocument();
        expect(screen.getByTestId("sidebar-menu")).toBeInTheDocument();
    });

    it("should handle undefined children", () => {
        render(<DashboardLayout>{undefined}</DashboardLayout>);

        expect(screen.getByTestId("mobile-menu")).toBeInTheDocument();
        expect(screen.getByTestId("sidebar-menu")).toBeInTheDocument();
    });

    it("should handle complex children structure", () => {
        render(
            <DashboardLayout>
                <header>
                    <h1>Page Title</h1>
                </header>
                <main>
                    <section>
                        <h2>Section Title</h2>
                        <p>Section content</p>
                    </section>
                </main>
                <footer>
                    <p>Footer content</p>
                </footer>
            </DashboardLayout>,
        );

        expect(screen.getByText("Page Title")).toBeInTheDocument();
        expect(screen.getByText("Section Title")).toBeInTheDocument();
        expect(screen.getByText("Section content")).toBeInTheDocument();
        expect(screen.getByText("Footer content")).toBeInTheDocument();
    });

    it("should maintain component structure", () => {
        render(
            <DashboardLayout>
                <div data-testid="main-content">Main Content</div>
            </DashboardLayout>,
        );

        expect(screen.getByTestId("mobile-menu")).toBeInTheDocument();
        expect(screen.getByTestId("sidebar-menu")).toBeInTheDocument();
        expect(screen.getByTestId("main-content")).toBeInTheDocument();
    });

    it("should handle React fragments as children", () => {
        render(
            <DashboardLayout>
                <>
                    <div data-testid="fragment-child-1">Fragment Child 1</div>
                    <div data-testid="fragment-child-2">Fragment Child 2</div>
                </>
            </DashboardLayout>,
        );

        expect(screen.getByTestId("fragment-child-1")).toBeInTheDocument();
        expect(screen.getByTestId("fragment-child-2")).toBeInTheDocument();
    });

    it("should handle conditional rendering", () => {
        const showContent = true;

        render(<DashboardLayout>{showContent && <div data-testid="conditional-content">Conditional Content</div>}</DashboardLayout>);

        expect(screen.getByTestId("conditional-content")).toBeInTheDocument();
    });

    it("should handle conditional rendering with false condition", () => {
        const showContent = false;

        render(<DashboardLayout>{showContent && <div data-testid="conditional-content">Conditional Content</div>}</DashboardLayout>);

        expect(screen.queryByTestId("conditional-content")).not.toBeInTheDocument();
    });
});
