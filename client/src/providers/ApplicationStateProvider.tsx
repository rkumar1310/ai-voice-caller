import {
    ApplicationState,
    ApplicationStateContext,
} from "@/context/ApplicationStateContext";
import { useState } from "react";

// src/providers/ApplicationStateProvider.tsx
export default function ApplicationStateProvider({
    children,
}: {
    children: React.ReactNode;
}) {
    const [applicationState, setApplicationState] = useState<ApplicationState>({
        isConnected: false,
    });

    return (
        <ApplicationStateContext.Provider
            value={{ applicationState, setApplicationState }}
        >
            {children}
        </ApplicationStateContext.Provider>
    );
}
