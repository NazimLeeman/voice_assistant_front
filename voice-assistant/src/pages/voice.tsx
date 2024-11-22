import { AnimatePresence, motion } from "framer-motion";
import {
  LiveKitRoom,
  useVoiceAssistant,
  BarVisualizer,
  RoomAudioRenderer,
  VoiceAssistantControlBar,
  AgentState,
  DisconnectButton,
  useConnectionState,
  useParticipantAttributes,
} from "@livekit/components-react";
import { useCallback, useEffect, useState } from "react";
import { MediaDeviceFailure, Participant, RoomEvent } from "livekit-client";
// import type { ConnectionDetails } from "./api/connection-details/route";
import { NoAgentNotification } from "../components/NoAgentNotification";
import { CloseIcon } from "../components/CloseIcon";
import { useRoomInfo, useRoomContext, useParticipants } from "@livekit/components-react";
import { RoomServiceClient } from "livekit-server-sdk";

type ParticipantFormProps = {
  onSubmit: (data: Record<string, any>) => void; // Specify the form data type here
  onCancel: () => void;
};

type SimpleVoiceAssistantProps = {
  onStateChange: (newState: any) => void; // Replace `any` with a specific type if the state structure is known
  participantInfo: any; // Replace with a more specific type if participantInfo has a defined structure
};

interface ConnectionDetails {
  participantToken: string;
  serverUrl: string;
}

const ParticipantForm: React.FC<ParticipantFormProps> = ({ onSubmit, onCancel }) => {
  const [name, setName] = useState("");
  const [language, setLanguage] = useState("");
  const [assistant, setAssistant] = useState("");
  const [context, setContext] = useState("");
  const [systemPrompt, setSystemPrompt] = useState("");

  return (
    <div className="bg-black p-6 rounded-lg shadow-lg max-w-md w-full">
      <div className="space-y-4">
        <div>
          <label className="block text-sm mb-1">Your Name *</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-3 py-2 bg-white/10 rounded-md"
            placeholder="Enter your name"
          />
        </div>
        <div>
          <label className="block text-sm mb-1">Select Language *</label>
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            className="w-full px-3 py-2 bg-white/10 text-gray-400 rounded-md"
          >
            <option value="" disabled className="text-white bg-black">Select a language</option>
            <option value="en" className="text-white bg-black">English</option>
            <option value="es" className="text-white bg-black">Spanish</option>
            <option value="fr" className="text-white bg-black">French</option>
            <option value="de" className="text-white bg-black">German</option>
            <option value="zh" className="text-white bg-black">Chinese</option>
            <option value="ar" className="text-white bg-black">Arabic</option>
            <option value="hi" className="text-white bg-black">Hindi</option>
            <option value="ja" className="text-white bg-black">Japanese</option>
          </select>
        </div>
        <div>
          <label className="block text-sm mb-1">Select Assistant *</label>
          <select
            value={assistant}
            onChange={(e) => setAssistant(e.target.value)}
            className="w-full px-3 py-2 bg-white/10 text-gray-400 rounded-md"
          >
            <option value="" disabled className="text-white bg-black">Select a assistant</option>
            <option value="hospital" className="text-white bg-black">Hospital</option>
            <option value="veterinarian" className="text-white bg-black">Veterinarian</option>
          </select>
        </div>
        <div>
          <label className="block text-sm mb-1">System Prompt</label>
          <textarea
            value={systemPrompt}
            onChange={(e) => setSystemPrompt(e.target.value)}
            className="w-full px-3 py-2 bg-white/10 rounded-md h-24"
            placeholder="Set the system prompt for the assistant..."
          />
        </div>
        <div>
          <label className="block text-sm mb-1">Context (Optional)</label>
          <textarea
            value={context}
            onChange={(e) => setContext(e.target.value)}
            className="w-full px-3 py-2 bg-white/10 rounded-md h-24"
            placeholder="Provide any context for the conversation..."
          />
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => onSubmit({ name, language, assistant, context, systemPrompt })}
            disabled={!name.trim() || !language.trim() || !assistant.trim()}
            className="flex-1 uppercase px-4 py-2 bg-white text-black rounded-md disabled:opacity-50"
          >
            Start
          </button>
          <button
            onClick={onCancel}
            className="px-4 py-2 bg-white/10 rounded-md"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default function Page() {
  const [connectionDetails, updateConnectionDetails] = useState<
    ConnectionDetails | undefined
  >(undefined);
  const [agentState, setAgentState] = useState<AgentState>("disconnected");

  const [showForm, setShowForm] = useState(false);
  const [participantInfo, setParticipantInfo] = useState(null);

  // const handleFormSubmit = useCallback(async (formData:any) => {
  //   setParticipantInfo(formData);
    
  //   const url = new URL(
  //     process.env.NEXT_PUBLIC_CONN_DETAILS_ENDPOINT ?? "/api/connection-details",
  //     window.location.origin
  //   );
    
  //   // Add participant info to the request
  //   url.searchParams.append("name", formData.name);
  //   if (formData.context) {
  //     url.searchParams.append("context", formData.context);
  //   }
    
  //   const response = await fetch(url.toString());
  //   console.log("RESPONSE", response)
  //   const connectionDetailsData = await response.json();
  //   console.log("CONNECTION DETAILS DATA", connectionDetailsData)
  //   setShowForm(false);
  //   updateConnectionDetails(connectionDetailsData);
  // }, []);

  const handleFormSubmit = useCallback(async (formData: any) => {
    try {
      setParticipantInfo(formData);
      const participantIdentity = `voice_assistant_user_${Math.floor(Math.random() * 10_000)}`;
      const roomName = `voice_assistant_room_${Math.floor(Math.random() * 10_000)}`;
      // Use your backend endpoint
      const url = new URL("http://localhost:3001/api/livekit/token");
      
      // Add participant info as query parameters
      url.searchParams.append("participantName", formData.name ?? "Anonymous");
      url.searchParams.append("roomName", roomName);
      if (formData.context) {
        url.searchParams.append("context", formData.context);
      }
      if (formData.systemPrompt) {
        url.searchParams.append("systemPrompt", formData.systemPrompt);
      }
      if (formData.language) {
        url.searchParams.append("language", formData.language);
      }

      if (formData.assistant) {
        url.searchParams.append("assistant", formData.assistant);
      }
  
      // Fetch connection details from your backend
      const response = await fetch(url.toString(), {
        method: "GET", // Adjust HTTP method if needed (e.g., POST)
        headers: {
          "Content-Type": "application/json",
          // Add additional headers like authentication tokens if required
          // Authorization: `Bearer ${yourToken}`,
        },
      });
      console.log("RESPONSE", response);
      if (!response.ok) {
        throw new Error(`Failed to fetch connection details: ${response.statusText}`);
      }
  
      const connectionDetailsData = await response.json();
      console.log("CONNECTION DETAILS DATA", connectionDetailsData);
  
      setShowForm(false);
      updateConnectionDetails(connectionDetailsData);
    } catch (error) {
      console.error("Error fetching connection details:", error);
      // Optionally, show an error message to the user
    }
  }, []);  

  const handleCreateRoom = async () => {
    const url = "http://localhost:3001/api/livekit/room";
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: "New Room",
        participantName: "New Room Participant",
      })
    });

    if (!response.ok) {
      throw new Error(`Error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json(); // Assuming the response is JSON
    console.log("Created Room:", data);
  }

  const onConnectButtonClicked = useCallback(async () => {
    // Generate room connection details, including:
    //   - A random Room name
    //   - A random Participant name
    //   - An Access Token to permit the participant to join the room
    //   - The URL of the LiveKit server to connect to
    //
    // In real-world application, you would likely allow the user to specify their
    // own participant name, and possibly to choose from existing rooms to join.

    // const url = new URL(
    //   process.env.NEXT_PUBLIC_CONN_DETAILS_ENDPOINT ??
    //   "/api/connection-details",
    //   window.location.origin
    // );
    // const response = await fetch(url.toString());
    // const connectionDetailsData = await response.json();
    // updateConnectionDetails(connectionDetailsData);
    setShowForm(true);
  }, []);

  return (
    <div
      className="h-full flex flex-row bg-white text-white"
    >
        <div className="w-2/4 flex justify-center items-center">
            <div className="bg-white px-6 py-4 rounded-lg shadow-md border">
                <div className="flex items-center mb-4">
                <img
                    src="https://via.placeholder.com/40"
                    alt="Profile"
                    className="rounded-full w-10 h-10 mr-3"
                />
                <div>
                    <p className="text-sm text-gray-500">Recepción: Veterinaria</p>
                    <h2 className="text-xl text-black font-bold">María</h2>
                </div>
                </div>
                <div>
                <p className="text-sm text-black mb-2">Tiene las siguientes habilidades:</p>
                <ul className="list-disc list-inside text-sm text-gray-700">
                    <li>Responder preguntas sobre la clínica, horarios y servicios</li>
                    <li>Crear, modificar y cancelar citas</li>
                    <li>No le hemos dado habilidad de compartir información sensible sobre pruebas</li>
                </ul>
                </div>
            </div>
        </div>

    <div className="flex-1 flex flex-col justify-center items-center">
      <AnimatePresence>
        {showForm && !connectionDetails && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 grid place-items-center p-4 z-50"
          >
            <ParticipantForm
              onSubmit={handleFormSubmit}
              onCancel={() => setShowForm(false)}
            />
          </motion.div>
        )}
      </AnimatePresence>

      <LiveKitRoom
        token={connectionDetails?.participantToken}
        serverUrl={connectionDetails?.serverUrl}
        connect={connectionDetails !== undefined}
        audio={true}
        video={false}
        onMediaDeviceFailure={onDeviceFailure}
        onDisconnected={() => {
          updateConnectionDetails(undefined);
          setParticipantInfo(null);
        }}
        className="flex flex-col items-center"
      >

        <div className="flex justify-center items-center p-4">
          <div className="w-60 h-60 rounded-full overflow-hidden border-4 border-black">
            <img 
              src="scooby.png"
              alt="Profile"
              className="w-full h-full object-cover"
            />
          </div>
        </div>

        <RoomInfoComponent />  
        <SimpleVoiceAssistant
          onStateChange={setAgentState}
          participantInfo={participantInfo}
        />
        <ControlBar
          onConnectButtonClicked={onConnectButtonClicked}
          agentState={agentState}
        />
        <RoomAudioRenderer />
        <NoAgentNotification state={agentState} />
      </LiveKitRoom>
      </div>
    </div>
  );
}

const  SimpleVoiceAssistant: React.FC<SimpleVoiceAssistantProps> = ({ onStateChange, participantInfo }) => {
  const { state, audioTrack } = useVoiceAssistant();
  console.log("STATE FROM SIMPLE VOICE ASSISTANT", state);
  useEffect(() => {
    onStateChange(state);
  }, [onStateChange, state]);

  if (state === "disconnected") {
    return null;
  }

  return (
    <div className="h-[100px] w-[300px] mb-8 mx-auto bg-black ">
      <BarVisualizer
        state={state}
        barCount={5}
        trackRef={audioTrack}
        className="agent-visualizer "
        options={{ minHeight: 32 }}
      />
    </div>
  );
}

function ControlBar(props: {
  onConnectButtonClicked: () => void;
  agentState: AgentState;
}) {
  /**
   * Use Krisp background noise reduction when available.
   * Note: This is only available on Scale plan, see {@link https://livekit.io/pricing | LiveKit Pricing} for more details.
   */
//   const krisp = useKrispNoiseFilter();
//   useEffect(() => {
//     krisp.setNoiseFilterEnabled(true);
//   }, []);

  return (
    <div className="relative h-[100px] w-[300px]">
      <AnimatePresence>
        {props.agentState === "disconnected" && (
          <motion.button
            initial={{ opacity: 0, top: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, top: "-10px" }}
            transition={{ duration: 1, ease: [0.09, 1.04, 0.245, 1.055] }}
            className="uppercase absolute left-1/2 -translate-x-1/2 px-4 py-2 bg-black text-white rounded-md"
            onClick={() => props.onConnectButtonClicked()}
          >
            Start
          </motion.button>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {props.agentState !== "disconnected" &&
          props.agentState !== "connecting" && (
            <motion.div
              initial={{ opacity: 0, top: "10px" }}
              animate={{ opacity: 1, top: 0 }}
              exit={{ opacity: 0, top: "-10px" }}
              transition={{ duration: 0.4, ease: [0.09, 1.04, 0.245, 1.055] }}
              className="flex h-8 w-full absolute left-1/2 -translate-x-1/2  justify-center"
            >
              {/* <VoiceAssistantControlBar controls={{ leave: false }} /> */}
              <DisconnectButton>
                <CloseIcon />
              </DisconnectButton>
            </motion.div>
          )}
      </AnimatePresence>
    </div>
  );
}

function RoomInfoComponent() {

  

  // useEffect(() => {
  //   fetchAllRooms();
  // },[])

  // const fetchAllRooms = async () => {
  //   const url = "http://localhost:3001/api/livekit/rooms";
  
  //   try {
  //     const response = await fetch(url, {
  //       method: "GET",
  //     });
  
  //     if (!response.ok) {
  //       throw new Error(`Error: ${response.status} ${response.statusText}`);
  //     }
  
  //     const data = await response.json(); // Assuming the response is JSON
  //     console.log("Fetched Rooms:", data);
  //     return data;
  //   } catch (error) {
  //     console.error("Failed to fetch rooms:", error);
  //   }
  // };

  
  const room = useRoomContext();
  const participants = useParticipants();
  const roomInfo = useRoomInfo({ room: room || null });
  const connectionState = useConnectionState(room || null);
  // useEffect(() => {
  //   const updateAttributes = async () => {
  //     if (room && room.localParticipant && connectionState === 'connected') {
  //       try {
  //         room.on(
  //           RoomEvent.ParticipantAttributesChanged,
  //           (changed: Record<string, string>, participant: Participant) => {
  //             console.log(
  //               'participant attributes changed',
  //               changed,
  //               'all attributes',
  //               participant.attributes,
  //             );
  //           },
  //         );
          
  //         room.on(
  //           RoomEvent.ParticipantMetadataChanged,
  //           (oldMetadata: string | undefined, participant: Participant) => {
  //             console.log('metadata changed from', oldMetadata, participant.metadata);
  //           },
  //         );
  //         await room.localParticipant.setAttributes({
  //           myKey: 'myValue',
  //           myOtherKey: 'otherValue',
  //         });
  //         await room.localParticipant.setMetadata(
  //           JSON.stringify({
  //             some: 'values',
  //           }),
  //         );
  //       } catch (error) {
  //         console.error("Failed to set attributes:", error);
  //       }
  //     }
  //   };

  //   updateAttributes();
  // }, [room]);

  useEffect(() => {
    console.log("Current Room:", room);
    console.log("Current Participants:", participants);
    console.log("Current Room Info:", roomInfo);
    console.log("Current Connection State:", connectionState);
  }, [room, participants, roomInfo, connectionState]);

  return null;
}

function onDeviceFailure(error?: MediaDeviceFailure) {
  console.error(error);
  alert(
    "Error acquiring camera or microphone permissions. Please make sure you grant the necessary permissions in your browser and reload the tab"
  );
}
