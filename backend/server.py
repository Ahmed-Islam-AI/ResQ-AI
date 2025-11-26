"""
ResQ-AI Backend MCP Server for Raindrop Platform
Real-time EMS Triage Assistant with Medical Risk Analysis
VERSION: Standalone (No Vultr/Qdrant Required)
"""

import os
from dotenv import load_dotenv
import json
import asyncio
from typing import Dict, List, Optional, Any
from dataclasses import dataclass
from datetime import datetime

import httpx
from fastapi import FastAPI, HTTPException, BackgroundTasks, WebSocket, WebSocketDisconnect, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
import random
import math


# ============================================================================
# CONFIGURATION - Insert Your API Keys Here
# ============================================================================
# Load environment variables
load_dotenv()

CEREBRAS_API_KEY = os.getenv("CEREBRAS_API_KEY", "your_cerebras_api_key_here")
CEREBRAS_API_URL = "https://api.cerebras.ai/v1/chat/completions"

ELEVENLABS_API_KEY = os.getenv("ELEVENLABS_API_KEY", "your_elevenlabs_api_key_here")
ELEVENLABS_API_URL = "https://api.elevenlabs.io/v1/text-to-speech"
ELEVENLABS_VOICE_ID = "21m00Tcm4TlvDq8ikWAM"  # Default voice ID (Rachel)

def _has_real_key(value: str, placeholder: str) -> bool:
    """Quick helper to detect whether a secret env var is still using its placeholder."""
    if not value:
        return False
    normalized = value.lower()
    return placeholder.lower() not in normalized and "replace_me" not in normalized


HAS_CEREBRAS_KEY = _has_real_key(CEREBRAS_API_KEY, "your_cerebras_api_key_here")
HAS_ELEVENLABS_KEY = _has_real_key(ELEVENLABS_API_KEY, "your_elevenlabs_api_key_here")

# ============================================================================
# IN-MEMORY PROTOCOL DATABASE (Replaces Qdrant)
# ============================================================================
MEDICAL_PROTOCOLS_DB = {
    "chest_pain": {
        "protocol": "Cardiac Emergency Protocol",
        "details": "Administer aspirin 324mg (chewable), establish IV access, obtain 12-lead ECG, consider nitroglycerin 0.4mg SL if systolic BP >100mmHg. Monitor for changes in vital signs.",
        "contraindications": ["Allergy to aspirin", "Active bleeding", "Hypotension (SBP <90mmHg)", "Recent use of PDE5 inhibitors"],
        "keywords": ["chest pain", "cardiac", "heart attack", "mi", "myocardial infarction", "angina"],
        "score": 0.95
    },
    "difficulty_breathing": {
        "protocol": "Respiratory Distress Protocol",
        "details": "Assess airway patency, administer oxygen via nasal cannula or non-rebreather to maintain SpO2 >94%. Consider albuterol 2.5mg nebulizer for bronchospasm. Position patient upright if tolerated.",
        "contraindications": ["Tension pneumothorax without decompression", "Severe hypotension"],
        "keywords": ["difficulty breathing", "dyspnea", "shortness of breath", "respiratory distress", "wheezing", "asthma", "copd"],
        "score": 0.93
    },
    "altered_mental_status": {
        "protocol": "Neurological Emergency Protocol",
        "details": "Check blood glucose immediately. Assess using AVPU or GCS. Perform FAST exam for stroke. Protect airway, administer oxygen. Consider dextrose if hypoglycemic (<60mg/dL). Monitor vitals continuously.",
        "contraindications": ["None for initial assessment"],
        "keywords": ["altered mental status", "confusion", "unresponsive", "stroke", "seizure", "syncope", "unconscious"],
        "score": 0.91
    },
    "severe_bleeding": {
        "protocol": "Hemorrhage Control Protocol",
        "details": "Apply direct pressure to wound. Use tourniquet for extremity hemorrhage if direct pressure fails. Establish large-bore IV access x2. Administer normal saline or LR for fluid resuscitation. Monitor for shock.",
        "contraindications": ["Do not remove impaled objects"],
        "keywords": ["bleeding", "hemorrhage", "laceration", "trauma", "blood loss", "severe bleeding"],
        "score": 0.94
    },
    "anaphylaxis": {
        "protocol": "Anaphylaxis Protocol",
        "details": "Immediately administer epinephrine 0.3mg IM (anterolateral thigh). Establish IV access. Administer diphenhydramine 50mg IV and famotidine 20mg IV. Consider albuterol nebulizer for bronchospasm. Prepare for airway management.",
        "contraindications": ["No absolute contraindications for epinephrine in anaphylaxis"],
        "keywords": ["anaphylaxis", "allergic reaction", "severe allergy", "hives", "angioedema", "throat swelling"],
        "score": 0.96
    },
    "hypoglycemia": {
        "protocol": "Hypoglycemia Protocol",
        "details": "Check blood glucose. If <60mg/dL and patient conscious, administer oral glucose 15g. If unconscious or unable to swallow, administer D50W 25g IV push or glucagon 1mg IM. Recheck glucose in 15 minutes.",
        "contraindications": ["Do not give oral glucose if airway compromised"],
        "keywords": ["hypoglycemia", "low blood sugar", "diabetic", "glucose", "altered mental status diabetic"],
        "score": 0.92
    },
    "seizure": {
        "protocol": "Seizure Management Protocol",
        "details": "Protect patient from injury. Do not restrain. Establish IV access when safe. If seizure >5 minutes or status epilepticus, administer midazolam 10mg IM or lorazepam 2-4mg IV. Monitor airway and breathing.",
        "contraindications": ["Do not force anything into mouth during active seizure"],
        "keywords": ["seizure", "convulsion", "epilepsy", "fitting", "status epilepticus"],
        "score": 0.90
    },
    "overdose": {
        "protocol": "Overdose/Poisoning Protocol",
        "details": "Assess airway, breathing, circulation. Administer naloxone 2-4mg IN/IM/IV for suspected opioid overdose. Consider activated charcoal if ingestion <1 hour and patient alert. Contact poison control. Monitor for respiratory depression.",
        "contraindications": ["Activated charcoal contraindicated if airway not protected or caustic ingestion"],
        "keywords": ["overdose", "poisoning", "narcan", "opioid", "intoxication", "drug abuse"],
        "score": 0.89
    },
    "general_assessment": {
        "protocol": "General Patient Assessment Protocol",
        "details": "Perform primary assessment (ABC). Obtain vital signs. Complete SAMPLE history. Perform focused physical exam. Establish IV access if indicated. Monitor and reassess every 5-15 minutes.",
        "contraindications": [],
        "keywords": ["general", "assessment", "evaluation", "patient care"],
        "score": 0.60
    }
}

DRUG_INTERACTIONS_DB = {
    "warfarin": {
        "interacts_with": ["aspirin", "nsaids", "heparin"],
        "risk": "CRITICAL - Increased bleeding risk",
        "recommendation": "Avoid aspirin. Use extreme caution with any anticoagulant."
    },
    "aspirin": {
        "interacts_with": ["warfarin", "heparin", "clopidogrel"],
        "risk": "HIGH - Increased bleeding risk",
        "recommendation": "Check for active bleeding or recent surgery before administration."
    },
    "nitroglycerin": {
        "interacts_with": ["sildenafil", "tadalafil", "vardenafil"],
        "risk": "CRITICAL - Severe hypotension",
        "recommendation": "Do not give if patient took PDE5 inhibitor (Viagra, Cialis) within 24-48 hours."
    },
    "morphine": {
        "interacts_with": ["benzodiazepines", "alcohol"],
        "risk": "HIGH - Respiratory depression",
        "recommendation": "Monitor respiratory status closely. Have naloxone ready."
    },
    "epinephrine": {
        "interacts_with": ["beta-blockers", "maoi"],
        "risk": "MODERATE - Altered response",
        "recommendation": "May require higher doses if patient on beta-blockers."
    }
}

# ============================================================================
# DATA MODELS
# ============================================================================
class PatientVitals(BaseModel):
    """Patient vital signs model"""
    blood_pressure: Optional[str] = Field(None, description="BP in format '120/80'")
    pulse: Optional[int] = Field(None, description="Heart rate in BPM")
    spo2: Optional[int] = Field(None, description="Oxygen saturation percentage")
    respiratory_rate: Optional[int] = Field(None, description="Breaths per minute")
    temperature: Optional[float] = Field(None, description="Body temperature in Celsius")
    timestamp: str = Field(default_factory=lambda: datetime.utcnow().isoformat())


class PatientHistory(BaseModel):
    """Patient medical history"""
    allergies: List[str] = Field(default_factory=list)
    current_medications: List[str] = Field(default_factory=list)
    medical_conditions: List[str] = Field(default_factory=list)
    chief_complaint: Optional[str] = None


class WarningEntry(BaseModel):
    """Model for a warning issued by the AI"""
    timestamp: str
    warning: str


class SessionContext(BaseModel):
    """Complete patient session context for SmartMemory"""
    session_id: str
    patient_vitals: PatientVitals
    patient_history: PatientHistory
    administered_medications: List[str] = Field(default_factory=list)
    actions_taken: List[str] = Field(default_factory=list)
    warnings_issued: List[WarningEntry] = Field(default_factory=list)
    created_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat())
    updated_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat())


class AnalysisRequest(BaseModel):
    """Request model for medical risk analysis"""
    transcript: str
    session_id: str


class TranscriptEntryModel(BaseModel):
    """Transcript entry coming from the frontend"""
    timestamp: str
    text: str
    speaker: str


class HandoffRequest(BaseModel):
    """Request model for SBAR handoff generation"""
    session_id: str
    transcript_entries: List[TranscriptEntryModel]


class ProtocolSearchRequest(BaseModel):
    """Request model for protocol search"""
    symptom: str
    limit: int = 3


class Hospital(BaseModel):
    """Hospital resource model"""
    id: str
    name: str
    distance_miles: float
    total_beds: int
    available_beds: int
    specialties: List[str]
    status: str  # "Normal", "Busy", "Diverting"


class TriageRequest(BaseModel):
    """Request model for triage calculation"""
    symptoms: List[str]
    can_walk: bool
    breathing: bool
    respiratory_rate: Optional[int]
    pulse: Optional[int]
    mental_status: str  # "Alert", "Verbal", "Pain", "Unresponsive"


class TriageResult(BaseModel):
    """Result of triage calculation"""
    esi_level: int
    color: str
    description: str
    recommended_action: str
    ai_rationale: Optional[str] = None
    ai_advice: Optional[str] = None


# ============================================================================
# RAINDROP SMARTMEMORY - Persistent Session Management
# ============================================================================
class SmartMemoryManager:
    """
    Manages persistent patient session data using Raindrop's SmartMemory
    Uses local JSON storage as implementation
    """
    
    def __init__(self, storage_path: str = "./smart_memory_sessions.json"):
        self.storage_path = storage_path
        self._ensure_storage_exists()
    
    def _ensure_storage_exists(self) -> None:
        """Initialize storage file if it doesn't exist"""
        if not os.path.exists(self.storage_path):
            with open(self.storage_path, 'w') as f:
                json.dump({}, f)

    def _load_sessions(self) -> Dict[str, Any]:
        """Safely load sessions from storage"""
        try:
            with open(self.storage_path, 'r') as f:
                content = f.read().strip()
                if not content:
                    return {}
                return json.loads(content)
        except (FileNotFoundError, json.JSONDecodeError):
            return {}
    
    def get_session(self, session_id: str) -> Optional[SessionContext]:
        """Retrieve session context from SmartMemory"""
        sessions = self._load_sessions()
        
        if session_id in sessions:
            return SessionContext(**sessions[session_id])
        return None
    
    def update_session(self, session_context: SessionContext) -> SessionContext:
        """Update session context in SmartMemory"""
        session_context.updated_at = datetime.utcnow().isoformat()
        
        sessions = self._load_sessions()
        
        sessions[session_context.session_id] = session_context.model_dump()
        
        with open(self.storage_path, 'w') as f:
            json.dump(sessions, f, indent=2)
        
        return session_context
    
    def create_session(self, session_id: str) -> SessionContext:
        """Create a new patient session"""
        session_context = SessionContext(
            session_id=session_id,
            patient_vitals=PatientVitals(),
            patient_history=PatientHistory()
        )
        return self.update_session(session_context)


# ============================================================================
# IN-MEMORY HOSPITAL DATABASE
# ============================================================================
HOSPITALS_DB = [
    {
        "id": "hosp_001",
        "name": "General City Hospital",
        "distance_miles": 2.4,
        "total_beds": 450,
        "available_beds": 42,
        "specialties": ["Stroke Center", "Cardiology"],
        "status": "Normal"
    },
    {
        "id": "hosp_002",
        "name": "St. Mary's Trauma Center",
        "distance_miles": 5.8,
        "total_beds": 600,
        "available_beds": 12,
        "specialties": ["Level 1 Trauma", "Burn Unit", "Neurosurgery"],
        "status": "Busy"
    },
    {
        "id": "hosp_003",
        "name": "Community Health Clinic",
        "distance_miles": 1.2,
        "total_beds": 50,
        "available_beds": 15,
        "specialties": ["Urgent Care", "Pediatrics"],
        "status": "Normal"
    },
    {
        "id": "hosp_004",
        "name": "University Research Hospital",
        "distance_miles": 8.5,
        "total_beds": 800,
        "available_beds": 3,
        "specialties": ["Oncology", "Transplant", "Rare Diseases"],
        "status": "Diverting"
    }
]


# ============================================================================
# IN-MEMORY PROTOCOL SEARCH (Replaces Qdrant)
# ============================================================================
class InMemoryProtocolSearch:
    """
    In-memory medical protocol search using keyword matching
    Fallback approach when Qdrant/Vultr is not available
    """
    
    def __init__(self):
        self.protocols = MEDICAL_PROTOCOLS_DB
        print("âœ… Using in-memory protocol database (No Vultr required)")
    
    async def search_protocol(self, symptom: str, limit: int = 3) -> List[Dict[str, Any]]:
        """
        Search for EMS protocols matching the symptom description
        Uses keyword matching instead of vector similarity
        
        Args:
            symptom: Patient symptom or complaint
            limit: Maximum number of protocols to return
        
        Returns:
            List of protocol documents with relevance scores
        """
        symptom_lower = symptom.lower()
        results = []
        
        # Score each protocol based on keyword matches
        for protocol_id, protocol_data in self.protocols.items():
            score = 0.0
            
            # Check if any keywords match
            for keyword in protocol_data["keywords"]:
                if keyword in symptom_lower:
                    score += 1.0
            
            # Normalize score
            if score > 0:
                score = min(score / len(protocol_data["keywords"]), 1.0)
                results.append({
                    "protocol": protocol_data["protocol"],
                    "details": protocol_data["details"],
                    "contraindications": protocol_data["contraindications"],
                    "score": score
                })
        
        # Sort by score descending
        results.sort(key=lambda x: x["score"], reverse=True)
        
        # If no matches, return general assessment
        if not results:
            general = self.protocols["general_assessment"]
            results.append({
                "protocol": general["protocol"],
                "details": general["details"],
                "contraindications": general["contraindications"],
                "score": 0.5
            })
        
        return results[:limit]


# ============================================================================
# DRUG INTERACTION CHECKER
# ============================================================================
def check_drug_interactions(
    current_medications: List[str],
    administered_medications: List[str]
) -> List[Dict[str, str]]:
    """
    Check for drug interactions between current and administered medications
    
    Args:
        current_medications: Medications patient is currently taking
        administered_medications: Medications being administered now
    
    Returns:
        List of interaction warnings
    """
    warnings = []
    
    for admin_med in administered_medications:
        admin_med_lower = admin_med.lower()
        
        # Check if administered medication is in our database
        for drug_name, drug_data in DRUG_INTERACTIONS_DB.items():
            if drug_name in admin_med_lower:
                # Check against current medications
                for current_med in current_medications:
                    current_med_lower = current_med.lower()
                    
                    for interacting_drug in drug_data["interacts_with"]:
                        if interacting_drug in current_med_lower:
                            warnings.append({
                                "drug1": admin_med,
                                "drug2": current_med,
                                "risk": drug_data["risk"],
                                "recommendation": drug_data["recommendation"]
                            })
    
    return warnings


# ============================================================================
# CEREBRAS INTEGRATION - Ultra-Low Latency Medical Risk Analysis
# ============================================================================
async def analyze_medical_risk(
    transcript: str,
    patient_history: PatientHistory,
    administered_medications: List[str]
) -> Dict[str, Any]:
    """
    Analyze medical transcript for safety risks using Cerebras Llama-3.1-70b
    
    Args:
        transcript: Voice transcription of paramedic actions/observations
        patient_history: Patient's medical history including allergies
        administered_medications: List of medications already given
    
    Returns:
        Dictionary with 'status' ('SAFE' or 'WARNING') and 'reason'
    """
    
    # First check drug interactions locally
    drug_warnings = check_drug_interactions(
        patient_history.current_medications,
        administered_medications
    )
    
    if drug_warnings:
        warning_text = "; ".join([
            f"{w['risk']} - {w['drug1']} + {w['drug2']}: {w['recommendation']}"
            for w in drug_warnings
        ])
        return {
            "status": "WARNING",
            "reason": warning_text,
            "raw_response": f"Drug interaction detected: {warning_text}",
            "source": "local_database"
        }
    
    # Skip remote analysis if no real Cerebras key is configured
    if not HAS_CEREBRAS_KEY:
        # Fallback: Simple keyword-based risk detection for demo purposes
        transcript_lower = transcript.lower()
        risk_keywords = {
            "shock": "Possible shock detected",
            "hypotension": "Hypotension detected",
            "dropping": "Unstable vitals detected",
            "bleeding": "Active hemorrhage detected",
            "unconscious": "Altered mental status detected",
            "seizure": "Seizure activity detected",
            "difficulty breathing": "Respiratory distress detected",
            "chest pain": "Cardiac event detected",
            "tachycardia": "High heart rate detected",
            "bradycardia": "Low heart rate detected",
            "desaturation": "Low oxygen saturation detected",
            "hypoxia": "Hypoxia detected",
            "stroke": "Possible stroke symptoms",
            "slurred": "Neurological deficit detected",
            "diaphoretic": "Sign of distress detected",
            "pale": "Sign of shock/distress detected"
        }
        
        for keyword, reason in risk_keywords.items():
            if keyword in transcript_lower:
                return {
                    "status": "WARNING",
                    "reason": reason,
                    "raw_response": f"Local detection: {reason}",
                    "source": "local_fallback"
                }

        return {
            "status": "SAFE",
            "reason": None,
            "raw_response": "Cerebras analysis skipped (API key not configured). No obvious risks detected locally.",
            "source": "local_only"
        }

    # Construct context-aware prompt
    history_context = f"""
Patient Allergies: {', '.join(patient_history.allergies) if patient_history.allergies else 'None reported'}
Current Medications: {', '.join(patient_history.current_medications) if patient_history.current_medications else 'None'}
Medical Conditions: {', '.join(patient_history.medical_conditions) if patient_history.medical_conditions else 'None'}
Medications Administered This Session: {', '.join(administered_medications) if administered_medications else 'None yet'}
"""
    
    system_prompt = """You are a medical safety guardrail AI for emergency medical services. 
Analyze the input for potential medical errors, drug contraindications, dosage concerns, or protocol violations based on the patient's history.
Reply ONLY with 'SAFE' if no issues detected, or 'WARNING: [Specific Reason]' if a risk is identified.
Be concise and specific about the risk."""
    
    user_prompt = f"""Patient Context:
{history_context}

Paramedic Transcript:
{transcript}

Analysis:"""
    
    headers = {
        "Authorization": f"Bearer {CEREBRAS_API_KEY}",
        "Content-Type": "application/json"
    }
    
    payload = {
        "model": "llama-3.3-70b",
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt}
        ],
        "temperature": 0.1,
        "max_tokens": 150
    }
    
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.post(
                CEREBRAS_API_URL,
                headers=headers,
                json=payload
            )
            response.raise_for_status()
            
            result = response.json()
            ai_response = result["choices"][0]["message"]["content"].strip()
            
            # Parse response
            if ai_response.startswith("SAFE"):
                return {
                    "status": "SAFE",
                    "reason": None,
                    "raw_response": ai_response,
                    "source": "cerebras_ai"
                }
            elif ai_response.startswith("WARNING:"):
                warning_text = ai_response.replace("WARNING:", "").strip()
                return {
                    "status": "WARNING",
                    "reason": warning_text,
                    "raw_response": ai_response,
                    "source": "cerebras_ai"
                }
            else:
                return {
                    "status": "WARNING",
                    "reason": f"Unusual AI response: {ai_response}",
                    "raw_response": ai_response,
                    "source": "cerebras_ai"
                }
    
    except httpx.HTTPStatusError as e:
        # Fallback to local checks only
        return {
            "status": "SAFE",
            "reason": None,
            "raw_response": f"Cerebras API unavailable, using local checks only: {e.response.text}",
            "source": "fallback"
        }
    except Exception as e:
        return {
            "status": "SAFE",
            "reason": None,
            "raw_response": f"Analysis unavailable: {str(e)}",
            "source": "fallback"
        }


# ============================================================================
# ELEVENLABS INTEGRATION - Audio Alert Generation
# ============================================================================
async def generate_audio_alert(text: str) -> bytes:
    """
    Generate audio alert using ElevenLabs Text-to-Speech
    
    Args:
        text: Warning text to convert to speech
    
    Returns:
        Audio bytes (MP3 format)
    """
    if not HAS_ELEVENLABS_KEY:
        return b""

    headers = {
        "xi-api-key": ELEVENLABS_API_KEY,
        "Content-Type": "application/json"
    }
    
    payload = {
        "text": text,
        "model_id": "eleven_multilingual_v2",
        "voice_settings": {
            "stability": 0.5,
            "similarity_boost": 0.75,
            "style": 0.0,
            "use_speaker_boost": True
        }
    }
    
    url = f"{ELEVENLABS_API_URL}/{ELEVENLABS_VOICE_ID}"
    
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                url,
                headers=headers,
                json=payload
            )
            response.raise_for_status()
            return response.content
    
    except Exception as e:
        # Return empty bytes if audio generation fails
        print(f"Audio generation failed: {str(e)}")
        return b""


async def create_sbar_summary(
    session: SessionContext,
    transcript_entries: List[TranscriptEntryModel]
) -> str:
    """
    Generate an SBAR-style handoff summary from transcript context.
    """
    if not transcript_entries:
        raise HTTPException(status_code=400, detail="Transcript is empty.")

    transcript_text = "\n".join(
        f"{entry.speaker.upper()} ({entry.timestamp}): {entry.text}"
        for entry in transcript_entries
    )

    patient_context = f"""
Patient Allergies: {', '.join(session.patient_history.allergies) if session.patient_history.allergies else 'None reported'}
Current Medications: {', '.join(session.patient_history.current_medications) if session.patient_history.current_medications else 'None'}
Medical Conditions: {', '.join(session.patient_history.medical_conditions) if session.patient_history.medical_conditions else 'Unknown'}
Last Recorded Vitals: BP {session.patient_vitals.blood_pressure or 'N/A'}, HR {session.patient_vitals.pulse or 'N/A'}, SpO2 {session.patient_vitals.spo2 or 'N/A'}, RR {session.patient_vitals.respiratory_rate or 'N/A'}
"""

    if not HAS_CEREBRAS_KEY:
        # Simple fallback summary when AI is unavailable
        latest_statement = transcript_entries[-1].text
        return (
            "SBAR Handoff:\n"
            f"S: Incoming EMS unit with patient requiring evaluation. Latest note: {latest_statement}\n"
            f"B: {patient_context.strip()}\n"
            "A: Awaiting AI assessment (Cerebras not configured).\n"
            "R: Continue monitoring and follow local protocols."
        )

    system_prompt = (
        "You are an EMS communications expert generating concise SBAR handoffs. "
        "Use the provided transcript and patient context to craft a 4-part SBAR summary "
        "with complete sentences under 60 words per section."
    )

    user_prompt = f"""
Patient Context:
{patient_context}

Transcript:
{transcript_text}

Please output using this template:
S: ...
B: ...
A: ...
R: ...
"""

    payload = {
        "model": "llama-3.3-70b",
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt}
        ],
        "temperature": 0.2,
        "max_tokens": 220
    }

    headers = {
        "Authorization": f"Bearer {CEREBRAS_API_KEY}",
        "Content-Type": "application/json"
    }

    try:
        async with httpx.AsyncClient(timeout=12.0) as client:
            response = await client.post(
                CEREBRAS_API_URL,
                headers=headers,
                json=payload
            )
            response.raise_for_status()
            result = response.json()
            return result["choices"][0]["message"]["content"].strip()
    except Exception as e:
        print(f"SBAR generation failed: {str(e)}")
        raise HTTPException(
            status_code=502,
            detail="Unable to generate SBAR handoff at this time."
        )


# ============================================================================
# FASTAPI APPLICATION
# ============================================================================
app = FastAPI(
    title="ResQ-AI MCP Server",
    description="Real-time EMS Triage Assistant with Medical Risk Analysis (Standalone Version)",
    version="2.0.0"
)

# Enable CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify your frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize services
smart_memory = SmartMemoryManager()
protocol_search = InMemoryProtocolSearch()

# ============================================================================
# WEBSOCKET CONNECTION MANAGER
# ============================================================================
class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []
        self.unit_locations: Dict[str, Dict[str, float]] = {}

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        self.active_connections.remove(websocket)

    async def broadcast(self, message: dict):
        for connection in self.active_connections:
            try:
                await connection.send_json(message)
            except Exception:
                # Handle potential disconnected clients that weren't cleanly removed
                pass

    async def update_location(self, unit_id: str, location: dict):
        self.unit_locations[unit_id] = location
        # Broadcast the full list of active units to everyone
        await self.broadcast({
            "type": "location_update",
            "units": self.unit_locations
        })

manager = ConnectionManager()

# ============================================================================
# AI ASSISTANT ENDPOINT
# ============================================================================
class AssistantRequest(BaseModel):
    query: str
    language: str = "english"

@app.post("/assistant/ask")
async def ask_assistant(request: AssistantRequest):
    """
    Handle natural language queries about medical protocols using Cerebras LLM.
    Supports English and Urdu.
    """
    query = request.query.lower()
    lang = request.language.lower()
    
    # 1. Search for relevant protocols (RAG Context)
    # Search is always done in English for now as DB is English
    results = await protocol_search.search_protocol(query, limit=1)
    
    context = ""
    if results:
        best_match = results[0]
        context = f"Relevant Protocol: {best_match['protocol']}\nDetails: {best_match['details']}\nContraindications: {', '.join(best_match['contraindications'])}"
    else:
        context = "No specific local protocol found. Use general EMS knowledge."

    # 2. Call Cerebras LLM
    if not HAS_CEREBRAS_KEY:
        # Fallback if no key
        if results:
            return {"response": f"Protocol: {results[0]['protocol']}. {results[0]['details']}"}
        return {"response": "I couldn't find a protocol for that and AI is offline."}

    lang_instruction = "Answer in English."
    if "urdu" in lang:
        lang_instruction = "Answer in Urdu (using Roman Urdu or Urdu script as appropriate for speech). Keep it simple and clear."

    system_prompt = f"""You are an expert EMS Assistant. 
Answer the user's question briefly and accurately based on the provided protocol context. 
{lang_instruction}
Keep the answer under 2 sentences. Speak naturally as if over a radio.
If the protocol context doesn't answer the question, use your general medical knowledge but mention it's general advice."""

    user_prompt = f"""Context:
{context}

User Question:
{request.query}

Answer:"""

    headers = {
        "Authorization": f"Bearer {CEREBRAS_API_KEY}",
        "Content-Type": "application/json"
    }
    
    payload = {
        "model": "llama-3.3-70b",
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt}
        ],
        "temperature": 0.1,
        "max_tokens": 150
    }
    
    try:
        async with httpx.AsyncClient(timeout=8.0) as client:
            response = await client.post(
                CEREBRAS_API_URL,
                headers=headers,
                json=payload
            )
            response.raise_for_status()
            result = response.json()
            ai_response = result["choices"][0]["message"]["content"].strip()
            
            return {
                "response": ai_response,
                "context_used": results[0]["protocol"] if results else "General"
            }
            
    except Exception as e:
        print(f"LLM Assistant Error: {e}")
        # Fallback to simple DB lookup
        if results:
            return {"response": f"Fallback: {results[0]['details']}"}
        return {"response": "I'm having trouble connecting to the AI right now."}

# ============================================================================
# API ENDPOINTS
# ============================================================================
@app.get("/")
async def root():
    return {"status": "online", "service": "ResQ-AI Backend", "version": "2.0.0"}



@app.get("/")
async def root():
    """Health check endpoint"""
    return {
        "service": "ResQ-AI MCP Server (Standalone)",
        "status": "operational",
        "version": "2.0.0",
        "features": {
            "smart_memory": "active",
            "protocol_search": "in-memory",
            "cerebras_ai": "configured" if CEREBRAS_API_KEY != "your_cerebras_api_key_here" else "not_configured",
            "elevenlabs_tts": "configured" if ELEVENLABS_API_KEY != "your_elevenlabs_api_key_here" else "not_configured"
        },
        "timestamp": datetime.utcnow().isoformat()
    }


@app.post("/session/create")
async def create_session(session_id: str):
    """Create a new patient session"""
    session = smart_memory.create_session(session_id)
    return {"message": "Session created", "session": session}


@app.get("/session/{session_id}")
async def get_session(session_id: str):
    """Retrieve patient session data"""
    session = smart_memory.get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    return session


@app.post("/session/{session_id}/update-vitals")
async def update_vitals(session_id: str, vitals: PatientVitals):
    """Update patient vitals in session"""
    session = smart_memory.get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    session.patient_vitals = vitals
    updated_session = smart_memory.update_session(session)
    return {"message": "Vitals updated", "session": updated_session}


@app.post("/analyze")
async def analyze_transcript(request: AnalysisRequest):
    """
    Analyze voice transcript for medical risks
    Returns risk assessment and audio alert if warning detected
    """
    # Get session context
    session = smart_memory.get_session(request.session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    # Perform risk analysis
    analysis_result = await analyze_medical_risk(
        transcript=request.transcript,
        patient_history=session.patient_history,
        administered_medications=session.administered_medications
    )
    
    response_data = {
        "session_id": request.session_id,
        "analysis": analysis_result,
        "audio_alert": None
    }
    
    # Generate audio alert if warning detected
    if analysis_result["status"] == "WARNING":
        alert_text = f"Warning: {analysis_result['reason']}"
        audio_bytes = await generate_audio_alert(alert_text)
        
        if audio_bytes:
            import base64
            response_data["audio_alert"] = base64.b64encode(audio_bytes).decode('utf-8')
        
        # Log warning in session
        session.warnings_issued.append(WarningEntry(
            timestamp=datetime.utcnow().isoformat(),
            warning=analysis_result['reason']
        ))
        smart_memory.update_session(session)
    
    return response_data


@app.post("/sbar/generate")
async def generate_sbar(request: HandoffRequest):
    """Generate SBAR handoff summary"""
    session = smart_memory.get_session(request.session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    summary = await create_sbar_summary(session, request.transcript_entries)
    return {"summary": summary}


@app.post("/protocol/generate")
async def generate_protocol(request: ProtocolSearchRequest):
    """Generate a dynamic protocol using AI if no static match found"""
    
    # First try local search
    results = await protocol_search.search_protocol(request.symptom, request.limit)
    if results:
        return {"protocols": results, "source": "static_db"}

    # If no results and no AI key, return generic
    if not HAS_CEREBRAS_KEY:
        return {
            "protocols": [{
                "protocol": "General Assessment (AI Unavailable)",
                "details": "Perform standard primary assessment. Monitor vitals. Transport to nearest facility.",
                "contraindications": [],
                "score": 0.5
            }],
            "source": "fallback"
        }

    # Use AI to generate protocol
    system_prompt = """You are an expert EMS Medical Director. 
    Generate a standard EMS protocol for the requested symptom. 
    Format: Protocol Name, Detailed Steps, Contraindications."""
    
    user_prompt = f"Generate EMS protocol for: {request.symptom}"

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.post(
                CEREBRAS_API_URL,
                headers={"Authorization": f"Bearer {CEREBRAS_API_KEY}", "Content-Type": "application/json"},
                json={
                    "model": "llama-3.3-70b",
                    "messages": [{"role": "system", "content": system_prompt}, {"role": "user", "content": user_prompt}],
                    "temperature": 0.2
                }
            )
            data = response.json()
            content = data["choices"][0]["message"]["content"]
            
            return {
                "protocols": [{
                    "protocol": f"Dynamic Protocol: {request.symptom}",
                    "details": content,
                    "contraindications": ["AI Generated - Verify with Medical Control"],
                    "score": 0.8
                }],
                "source": "ai_generated"
            }
    except Exception as e:
        return {
            "protocols": [{
                "protocol": "Error Generating Protocol",
                "details": "Please follow standard operating procedures.",
                "contraindications": [],
                "score": 0.0
            }],
            "source": "error"
        }



@app.post("/protocol/search")
async def search_protocol(request: ProtocolSearchRequest):
    """Search for EMS protocols based on symptom"""
    protocols = await protocol_search.search_protocol(
        symptom=request.symptom,
        limit=request.limit
    )
    return {"symptom": request.symptom, "protocols": protocols}


@app.post("/handoff/generate")
async def generate_handoff(request: HandoffRequest):
    """Generate SBAR handoff summary from transcript history"""
    session = smart_memory.get_session(request.session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    summary = await create_sbar_summary(session, request.transcript_entries)
    return {
        "session_id": request.session_id,
        "summary": summary
    }


@app.post("/session/{session_id}/add-medication")
async def add_medication(session_id: str, medication: str):
    """Log administered medication to session"""
    session = smart_memory.get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    session.administered_medications.append({
        "medication": medication,
        "timestamp": datetime.utcnow().isoformat()
    })
    
    updated_session = smart_memory.update_session(session)
    return {"message": "Medication logged", "session": updated_session}


@app.get("/protocols/list")
async def list_all_protocols():
    """List all available medical protocols"""
    return {
        "total": len(MEDICAL_PROTOCOLS_DB),
        "protocols": [
            {
                "id": protocol_id,
                "name": data["protocol"],
                "keywords": data["keywords"]
            }
            for protocol_id, data in MEDICAL_PROTOCOLS_DB.items()
        ]
    }


@app.get("/hospitals")
async def list_hospitals():
    """List nearby hospitals and their status"""
    # Simulate dynamic changes
    for hospital in HOSPITALS_DB:
        change = random.randint(-2, 2)
        hospital["available_beds"] = max(0, min(hospital["total_beds"], hospital["available_beds"] + change))
        
        # Update status based on capacity
        occupancy = (hospital["total_beds"] - hospital["available_beds"]) / hospital["total_beds"]
        if occupancy > 0.95:
            hospital["status"] = "Diverting"
        elif occupancy > 0.85:
            hospital["status"] = "Busy"
        else:
            hospital["status"] = "Normal"
            
    return {"hospitals": HOSPITALS_DB}


class TriageResult(BaseModel):
    """Result of triage calculation"""
    esi_level: int
    color: str
    description: str
    recommended_action: str
    ai_rationale: Optional[str] = None
    ai_advice: Optional[str] = None


@app.post("/triage/calculate")
async def calculate_triage(request: TriageRequest):
    """
    Calculate ESI Triage Level based on patient inputs.
    Implements standard ESI algorithm logic + AI Rationale.
    """
    # 1. Calculate Standard ESI Level (Algorithmic Baseline)
    esi_level = 5
    color = "Blue"
    description = "Non-Urgent"
    recommended_action = "Non-Urgent. Prescription refill or wound check. Discharge likely."

    # ESI Level 1
    if not request.breathing or (request.pulse is not None and request.pulse == 0) or request.mental_status == "Unresponsive":
        esi_level = 1
        color = "Red"
        description = "Resuscitation"
        recommended_action = "Immediate life-saving intervention required. Call Code Blue."
    
    # ESI Level 2
    elif any(s in sym.lower() for sym in request.symptoms for s in ["chest pain", "stroke", "severe bleeding", "difficulty breathing"]):
        esi_level = 2
        color = "Orange"
        description = "Emergent"
        recommended_action = "High risk. Rapid placement and treatment. Continuous monitoring."
    elif request.mental_status in ["Verbal", "Pain"] or (request.pulse and request.pulse > 120) or (request.respiratory_rate and request.respiratory_rate > 30):
        esi_level = 2
        color = "Orange"
        description = "Emergent"
        recommended_action = "High risk. Rapid placement and treatment. Continuous monitoring."
    
    # ESI Level 3
    elif not request.can_walk or len(request.symptoms) > 1:
        esi_level = 3
        color = "Yellow"
        description = "Urgent"
        recommended_action = "Urgent. Needs 2+ resources (labs, x-ray, IV). Monitor vitals."
    
    # ESI Level 4
    elif len(request.symptoms) == 1:
        esi_level = 4
        color = "Green"
        description = "Less Urgent"
        recommended_action = "Less Urgent. Needs 1 resource. Sutures or simple x-ray."

    # 2. Generate AI Rationale & Advice (Cerebras)
    ai_rationale = "AI analysis unavailable."
    ai_advice = "Follow standard protocols."

    if HAS_CEREBRAS_KEY:
        system_prompt = """You are an expert Triage Nurse. 
        Explain the assigned ESI Level and provide specific clinical advice.
        Format: Rationale|Advice
        Keep it concise."""
        
        user_prompt = f"""
        Patient: {', '.join(request.symptoms)}
        Vitals: HR {request.pulse}, RR {request.respiratory_rate}, {request.mental_status}
        Assigned ESI: Level {esi_level} ({description})
        
        Provide:
        1. Clinical Rationale (Why this level?)
        2. Specific Advice (What to do next?)
        """
        
        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                response = await client.post(
                    CEREBRAS_API_URL,
                    headers={"Authorization": f"Bearer {CEREBRAS_API_KEY}", "Content-Type": "application/json"},
                    json={
                        "model": "llama-3.3-70b",
                        "messages": [{"role": "system", "content": system_prompt}, {"role": "user", "content": user_prompt}],
                        "temperature": 0.2,
                        "max_tokens": 100
                    }
                )
                if response.status_code == 200:
                    content = response.json()["choices"][0]["message"]["content"]
                    parts = content.split("|")
                    if len(parts) == 2:
                        ai_rationale = parts[0].strip()
                        ai_advice = parts[1].strip()
                    else:
                        ai_rationale = content
                        ai_advice = "Monitor patient closely."
        except Exception as e:
            print(f"Triage AI Error: {e}")

    return TriageResult(
        esi_level=esi_level,
        color=color,
        description=description,
        recommended_action=recommended_action,
        ai_rationale=ai_rationale,
        ai_advice=ai_advice
    )


class SpeakRequest(BaseModel):
    text: str


@app.post("/speak")
async def speak_text(request: SpeakRequest):
    """
    Generate audio from text using ElevenLabs
    """
    if not request.text:
        raise HTTPException(status_code=400, detail="Text is required")

    audio_bytes = await generate_audio_alert(request.text)
    
    if not audio_bytes:
        # If no key or error, return 503 or just empty
        if not HAS_ELEVENLABS_KEY:
             raise HTTPException(status_code=503, detail="ElevenLabs API key not configured")
        raise HTTPException(status_code=500, detail="Failed to generate audio")

    import base64
    return {
        "audio_base64": base64.b64encode(audio_bytes).decode('utf-8')
    }



# ============================================================================
# NEW ENDPOINTS FOR COMMAND CENTER
# ============================================================================

# ============================================================================
# SIMULATION & DYNAMIC INCIDENTS
# ============================================================================

async def simulate_vitals_task(session_id: str):
    """Background task to simulate changing vitals"""
    session = smart_memory.get_session(session_id)
    if not session:
        return

    # Run for 5 minutes (150 * 2 seconds)
    for _ in range(150):
        await asyncio.sleep(2)
        
        # Randomly fluctuate vitals
        current_pulse = session.patient_vitals.pulse or 80
        current_spo2 = session.patient_vitals.spo2 or 98
        current_sys = int(session.patient_vitals.blood_pressure.split('/')[0]) if session.patient_vitals.blood_pressure else 120
        
        new_pulse = max(40, min(180, current_pulse + random.randint(-5, 5)))
        new_spo2 = max(85, min(100, current_spo2 + random.randint(-1, 1)))
        new_sys = max(80, min(200, current_sys + random.randint(-5, 5)))
        
        session.patient_vitals.pulse = new_pulse
        session.patient_vitals.spo2 = new_spo2
        session.patient_vitals.blood_pressure = f"{new_sys}/80"
        session.patient_vitals.respiratory_rate = random.randint(12, 20)
        
        smart_memory.update_session(session)

@app.post("/session/{session_id}/simulate")
async def start_simulation(session_id: str, background_tasks: BackgroundTasks):
    """Start a background simulation of patient vitals"""
    background_tasks.add_task(simulate_vitals_task, session_id)
    return {"message": "Simulation started"}

@app.get("/incidents")
async def get_incidents(latitude: float = Query(40.7128), longitude: float = Query(-74.0060)):
    """
    Get active incidents near the provided location.
    Generates mock data dynamically around the user.
    """
    # Generate 3 random incidents around the user's location
    incidents = []
    types = ["Cardiac Arrest", "Traffic Accident", "Difficulty Breathing", "Seizure", "Fire Standby"]
    
    for i in range(1, 4):
        # Random offset within ~5km
        lat_offset = random.uniform(-0.04, 0.04)
        lng_offset = random.uniform(-0.04, 0.04)
        
        incidents.append({
            "id": f"inc-{i:03d}",
            "type": random.choice(types),
            "status": "Active",
            "latitude": latitude + lat_offset,
            "longitude": longitude + lng_offset,
            "address": f"{random.randint(1, 999)} Emergency Ln",
            "unit": "Unassigned"
        })
        
    return {"incidents": incidents}

@app.websocket("/ws/location/{unit_id}")
async def websocket_endpoint(websocket: WebSocket, unit_id: str):
    await manager.connect(websocket)
    try:
        while True:
            data = await websocket.receive_json()
            # Expecting data to be {"latitude": float, "longitude": float}
            if "latitude" in data and "longitude" in data:
                await manager.update_location(unit_id, {
                    "latitude": data["latitude"],
                    "longitude": data["longitude"],
                    "unit_id": unit_id,
                    "timestamp": datetime.utcnow().isoformat()
                })
    except WebSocketDisconnect:
        manager.disconnect(websocket)
        # Optional: Remove unit from active list or mark as offline
        if unit_id in manager.unit_locations:
            del manager.unit_locations[unit_id]
            await manager.broadcast({
                "type": "location_update",
                "units": manager.unit_locations
            })

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
