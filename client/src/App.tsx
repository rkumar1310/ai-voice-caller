import "browser-reset/reset.css";
import Agent from "./components/Agent";
import User from "./components/User";
import WebsocketProvider from "./providers/WebsocketProvider";
import ApplicationStateProvider from "./providers/ApplicationStateProvider";
import AudioPlaybackProvider from "./providers/AudioPlaybackProvider";
import StartButton from "./components/StartButton";
import { MicrophoneProvider } from "./providers/MicrophoneProvider";
function App() {
    return (
        <>
            <div
                style={{
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                    height: "100dvh",
                    width: "100vw",
                    background:
                        "radial-gradient(circle, rgba(62,57,115,1) 0%, rgba(10,9,23,1) 100%)",
                    flexDirection: "column",
                    gap: "10rem",
                    position: "relative",
                }}
            >
                <ApplicationStateProvider>
                    <AudioPlaybackProvider>
                        <MicrophoneProvider>
                            <WebsocketProvider address="ws://localhost:8765">
                                <Agent />
                                <User />
                                <StartButton />
                            </WebsocketProvider>
                        </MicrophoneProvider>
                    </AudioPlaybackProvider>
                </ApplicationStateProvider>
            </div>
        </>
    );
}

export default App;
