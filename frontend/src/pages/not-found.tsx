import { Link } from "react-router";

const NotFound: React.FC = () => {
    return (
        <div className="flex min-h-screen items-center justify-center bg-white p-4">
            <div className="max-w-md space-y-4 text-center">
                <h1 className="text-9xl font-extrabold text-blue-600">404</h1>
                <h2 className="text-4xl font-bold text-blue-600">Page Not Found</h2>
                <p className="mt-4 text-lg text-blue-600">Oops! The page you're looking for doesn't exist. It might have been moved or deleted.</p>
                <Link
                    to="/"
                    className="mt-8 inline-block rounded-lg bg-blue-600 px-6 py-3 font-semibold text-white shadow-md transition-colors duration-300 hover:bg-blue-700"
                >
                    Go to Homepage
                </Link>
            </div>
        </div>
    );
};

export default NotFound;
