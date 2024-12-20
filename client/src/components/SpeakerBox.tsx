export default function SpeakerBox({
    children,
    active,
    audioLevel,
}: {
    children?: React.ReactNode;
    active?: boolean;
    audioLevel?: number;
}) {
    return (
        <div
            style={{
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                width: "15rem",
                height: "15rem",
                position: "relative",
                opacity: active ? 1 : 0.2,
            }}
        >
            <div
                style={{
                    position: "absolute",
                    width: `100%`,
                    height: `100%`,
                    background: "rgba(256,256,256,0.2)",
                    zIndex: 1,
                    borderRadius: "50%",
                    transform: `scale(${1 + ((audioLevel || 0) * 0.2) / 100})`,
                }}
            >
                <div
                    style={{
                        position: "absolute",
                        width: "80%",
                        height: "80%",
                        background: "rgba(0, 0,0,0.5)",
                        zIndex: 1,
                        borderRadius: "50%",
                        top: "50%",
                        left: "50%",
                        transform: "translate(-50%, -50%)",
                    }}
                >
                    {children}
                </div>
            </div>
        </div>
    );
}
