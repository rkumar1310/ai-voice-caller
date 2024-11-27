import "browser-reset/reset.css";
import SpeakerBox from "./components/SpeakerBox";
import MicIcon from "./icons/Mic";
import BotIcon from "./icons/Bot";
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
                }}
            >
                <SpeakerBox active>
                    <BotIcon
                        style={{
                            width: "50%",
                            height: "50%",
                            position: "absolute",
                            top: "50%",
                            left: "50%",
                            transform: "translate(-50%, -50%)",
                            color: "rgba(255, 255, 255, 0.8)",
                        }}
                    />
                </SpeakerBox>
                <SpeakerBox>
                    <MicIcon
                        style={{
                            width: "50%",
                            height: "50%",
                            position: "absolute",
                            top: "50%",
                            left: "50%",
                            transform: "translate(-50%, -50%)",
                            color: "rgba(255, 255, 255, 0.8)",
                        }}
                    />
                </SpeakerBox>
            </div>
        </>
    );
}

export default App;
