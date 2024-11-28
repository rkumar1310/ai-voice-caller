import { createContext, useContext } from "react";

export interface ApplicationState {
    isConnected: boolean;
}

export const ApplicationStateContext = createContext<{
    applicationState: ApplicationState;
    setApplicationState: React.Dispatch<React.SetStateAction<ApplicationState>>;
} | null>(null);

export const useApplicationState = () => {
    const context = useContext(ApplicationStateContext);
    if (!context) {
        throw new Error(
            "useApplicationState must be used within an ApplicationStateProvider"
        );
    }
    return context;
};
