import React, { useEffect, useRef } from "react";

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    children: React.ReactNode;
    title?: string;
}

const Modal: React.FC<ModalProps> = ({ isOpen, onClose, children, title }) => {
    const modalContentRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleEscape = (event: KeyboardEvent) => {
            if (event.key === "Escape") {
                onClose();
            }
        };

        if (isOpen) {
            document.addEventListener("keydown", handleEscape);
            document.body.style.overflow = "hidden";
        }

        return () => {
            document.removeEventListener("keydown", handleEscape);
            document.body.style.overflow = "";
        };
    }, [isOpen, onClose]);

    if (!isOpen) {
        return null;
    }

    const handleOverlayClick = (event: React.MouseEvent<HTMLDivElement>) => {
        if (modalContentRef.current && !modalContentRef.current.contains(event.target as Node)) {
            onClose();
        }
    };

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4"
            onClick={handleOverlayClick}
        >
            <div
                ref={modalContentRef}
                className="flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-lg bg-white shadow-xl"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-center justify-between border-b border-gray-200 p-4">
                    <h2 className="text-xl font-semibold text-gray-800">{title || "Modal"}</h2>
                    <button
                        onClick={onClose}
                        className="text-gray-500 transition-colors duration-200 hover:text-gray-700"
                        aria-label="Close modal"
                    >
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>

                <div className="flex-grow overflow-y-auto p-4">{children}</div>
            </div>
        </div>
    );
};

export default Modal;
