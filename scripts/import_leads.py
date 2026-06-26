"""
Bulk Lead Import Script
=======================
Imports historical CRM leads directly into the database.
Bypasses the AI Agent (designed for live incoming leads) for speed.
Run from the backend directory:
    python ../scripts/import_leads.py
"""
import os, sys
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "backend"))
os.environ.setdefault("AI_PROVIDER", "mock")

from database import Base, SessionLocal, engine
from models import DBLead, DBFollowup

Base.metadata.create_all(bind=engine)

# ── Status mapping ─────────────────────────────────────────────────────────────
STATUS_MAP = {
    "New":               "New",
    "Contacted":         "Contacted",
    "Qualified":         "Qualified",
    "Won":               "Closed",
    "Lost":              "Closed",
    "Proposal Sent":     "Contacted",
    "Meeting Scheduled": "Qualified",
    "Negotiation":       "Qualified",
}

SCORE_MAP = {
    "High":   "Hot",
    "Medium": "Warm",
    "Low":    "Cold",
}

# ── Raw data (TSV) ─────────────────────────────────────────────────────────────
RAW = """L0001\tNovaLabs\tnovalabs.io\tBenjamin\tSmith\tCOO\tbenjamin.smith@novalabs.io\t+1-555-967-8103\tUSA\tEdTech\t1-10\tUpwork\tNew\tMedium\t2026-05-12\t2026-05-25\t43000\tRequested demo
L0002\tBlueAI\tblueai.io\tJames\tClark\tHead of AI\tjames.clark@blueai.io\t+1-555-377-6648\tUAE\tEdTech\t51-200\tReferral\tProposal Sent\tLow\t2026-05-14\t2026-05-30\t2500\tBudget approved
L0003\tBrightDigital\tbrightdigital.io\tMia\tAllen\tFounder\tmia.allen@brightdigital.io\t+1-555-370-4642\tGermany\tSaaS\t1-10\tLinkedIn\tMeeting Scheduled\tMedium\t2026-05-17\t2026-05-31\t41000\tNeeds CRM integration
L0004\tVertexTech\tvertextech.io\tAmelia\tBrown\tCOO\tamelia.brown@vertextech.io\t+1-555-309-6361\tPakistan\tFinTech\t51-200\tUpwork\tNew\tHigh\t2026-06-22\t2026-07-04\t15500\tInterested in AI automation
L0005\tVisionLogic\tvisionlogic.io\tAva\tWilson\tFounder\tava.wilson@visionlogic.io\t+1-555-251-7984\tNetherlands\tFinTech\t1-10\tUpwork\tQualified\tMedium\t2026-06-17\t2026-06-22\t24000\tInterested in AI automation
L0006\tNovaAI\tnovaai.io\tMia\tClark\tHead of AI\tmia.clark@novaai.io\t+1-555-891-4817\tUK\tCybersecurity\t501-1000\tWebsite\tQualified\tMedium\t2026-05-31\t2026-06-19\t51000\tEvaluating vendors
L0007\tCloudWorks\tcloudworks.io\tGrace\tCarter\tSales Director\tgrace.carter@cloudworks.io\t+1-555-207-5499\tCanada\tMarketing\t11-50\tUpwork\tQualified\tMedium\t2026-05-21\t2026-05-27\t47000\tInterested in MCP
L0008\tBlueWorks\tblueworks.io\tNoah\tCarter\tCTO\tnoah.carter@blueworks.io\t+1-555-616-1372\tNetherlands\tHealthcare\t51-200\tReferral\tWon\tMedium\t2026-05-29\t2026-06-06\t12000\tInterested in MCP
L0009\tNovaLogic\tnovalogic.io\tOlivia\tGreen\tVP Technology\tolivia.green@novalogic.io\t+1-555-825-8586\tUAE\tMarketing\t11-50\tWebsite\tWon\tHigh\t2026-06-08\t2026-06-24\t15000\tBudget approved
L0010\tVisionTech\tvisiontech.io\tBenjamin\tBrown\tProduct Manager\tbenjamin.brown@visiontech.io\t+1-555-912-2773\tSweden\tFinTech\t51-200\tConference\tNew\tHigh\t2026-06-06\t2026-06-20\t21000\tWants workflow automation
L0011\tNovaAI\tnovaai.io\tAmelia\tBaker\tProduct Manager\tamelia.baker@novaai.io\t+1-555-370-6136\tNetherlands\tFinTech\t1000+\tReferral\tProposal Sent\tHigh\t2026-06-20\t2026-07-03\t71000\tInterested in MCP
L0012\tQuantumSystems\tquantumsystems.io\tEthan\tScott\tEngineering Manager\tethan.scott@quantumsystems.io\t+1-555-681-5550\tNetherlands\tCybersecurity\t201-500\tWebsite\tContacted\tMedium\t2026-06-19\t2026-06-24\t38500\tInterested in AI automation
L0013\tNovaDigital\tnovadigital.io\tGrace\tGreen\tEngineering Manager\tgrace.green@novadigital.io\t+1-555-387-6192\tNetherlands\tRetail\t1000+\tUpwork\tQualified\tLow\t2026-05-23\t2026-06-10\t58500\tEvaluating vendors
L0014\tQuantumAI\tquantumai.io\tLiam\tTaylor\tCOO\tliam.taylor@quantumai.io\t+1-555-390-5023\tUK\tReal Estate\t11-50\tLinkedIn\tQualified\tLow\t2026-05-18\t2026-05-30\t11000\tBudget approved
L0015\tBlueDigital\tbluedigital.io\tJames\tDavis\tHead of AI\tjames.davis@bluedigital.io\t+1-555-161-3024\tPakistan\tRetail\t11-50\tWebsite\tNew\tHigh\t2026-06-26\t2026-07-05\t23000\tRequested demo
L0016\tQuantumSolutions\tquantumsolutions.io\tIsabella\tDavis\tCTO\tisabella.davis@quantumsolutions.io\t+1-555-827-2836\tSweden\tHealthcare\t1-10\tUpwork\tQualified\tMedium\t2026-05-31\t2026-06-04\t44500\tEvaluating vendors
L0017\tBrightWorks\tbrightworks.io\tMia\tAdams\tCEO\tmia.adams@brightworks.io\t+1-555-756-1453\tAustralia\tMarketing\t1000+\tConference\tMeeting Scheduled\tHigh\t2026-05-16\t2026-05-26\t27500\tLooking for RAG chatbot
L0018\tNovaLabs\tnovalabs.io\tGrace\tWalker\tEngineering Manager\tgrace.walker@novalabs.io\t+1-555-190-4022\tSingapore\tManufacturing\t201-500\tCold Email\tNew\tMedium\t2026-05-31\t2026-06-09\t17000\tNeeds CRM integration
L0019\tBrightTech\tbrighttech.io\tAiden\tScott\tVP Technology\taiden.scott@brighttech.io\t+1-555-354-8065\tSweden\tManufacturing\t501-1000\tLinkedIn\tNew\tHigh\t2026-05-17\t2026-05-28\t46000\tInterested in MCP
L0020\tBlueTech\tblutech.io\tOlivia\tGreen\tFounder\tolivia.green@bluetech.io\t+1-555-194-7255\tUSA\tFinTech\t11-50\tUpwork\tQualified\tMedium\t2026-06-11\t2026-06-19\t13000\tInterested in AI automation
L0021\tFusionDigital\tfusiondigital.io\tJack\tClark\tCOO\tjack.clark@fusiondigital.io\t+1-555-978-3367\tNetherlands\tReal Estate\t1000+\tUpwork\tLost\tMedium\t2026-05-31\t2026-06-10\t36000\tEvaluating vendors
L0022\tNextAI\tnextai.io\tHenry\tJohnson\tOperations Manager\thenry.johnson@nextai.io\t+1-555-565-3873\tCanada\tLogistics\t1000+\tReferral\tContacted\tMedium\t2026-06-20\t2026-06-24\t40500\tInterested in AI automation
L0023\tVertexLogic\tvertexlogic.io\tHarper\tDavis\tCEO\tharper.davis@vertexlogic.io\t+1-555-176-3739\tUK\tCybersecurity\t201-500\tLinkedIn\tQualified\tHigh\t2026-05-30\t2026-06-17\t55500\tNeeds CRM integration
L0024\tFusionDigital\tfusiondigital.io\tHenry\tBaker\tEngineering Manager\thenry.baker@fusiondigital.io\t+1-555-332-9717\tSingapore\tMarketing\t501-1000\tReferral\tMeeting Scheduled\tMedium\t2026-06-16\t2026-06-22\t2000\tEvaluating vendors
L0025\tBlueLogic\tbluelogic.io\tLucas\tWalker\tProduct Manager\tlucas.walker@bluelogic.io\t+1-555-659-5737\tSingapore\tCybersecurity\t51-200\tReferral\tProposal Sent\tMedium\t2026-06-18\t2026-07-06\t18500\tRequested demo
L0026\tBrightLogic\tbrightlogic.io\tAva\tWalker\tProduct Manager\tava.walker@brightlogic.io\t+1-555-269-2426\tUSA\tMarketing\t51-200\tLinkedIn\tLost\tLow\t2026-06-09\t2026-06-12\t48500\tInterested in MCP
L0027\tBrightLogic\tbrightlogic.io\tBenjamin\tJohnson\tFounder\tbenjamin.johnson@brightlogic.io\t+1-555-975-7980\tSweden\tSaaS\t1-10\tReferral\tProposal Sent\tHigh\t2026-06-12\t2026-06-25\t41000\tLooking for RAG chatbot
L0028\tQuantumAI\tquantumai.io\tDaniel\tHill\tCOO\tdaniel.hill@quantumai.io\t+1-555-245-4396\tGermany\tRetail\t1000+\tReferral\tContacted\tMedium\t2026-06-26\t2026-07-05\t36500\tWants workflow automation
L0029\tBlueDigital\tbluedigital.io\tDaniel\tAdams\tFounder\tdaniel.adams@bluedigital.io\t+1-555-860-6041\tAustralia\tSaaS\t1000+\tWebsite\tProposal Sent\tHigh\t2026-06-16\t2026-06-20\t53500\tWants workflow automation
L0030\tVertexSolutions\tvertexsolutions.io\tJack\tClark\tOperations Manager\tjack.clark@vertexsolutions.io\t+1-555-485-7741\tGermany\tCybersecurity\t1000+\tLinkedIn\tContacted\tMedium\t2026-05-19\t2026-05-25\t54500\tRequested demo
L0031\tCloudLogic\tcloudlogic.io\tEmma\tTaylor\tEngineering Manager\temma.taylor@cloudlogic.io\t+1-555-992-8274\tSweden\tMarketing\t51-200\tConference\tProposal Sent\tHigh\t2026-06-03\t2026-06-06\t58500\tWants workflow automation
L0032\tFusionDigital\tfusiondigital.io\tDaniel\tGreen\tSales Director\tdaniel.green@fusiondigital.io\t+1-555-931-6961\tSingapore\tRetail\t51-200\tCold Email\tContacted\tHigh\t2026-05-17\t2026-05-24\t34500\tLooking for RAG chatbot
L0033\tBlueWorks\tblueworks.io\tNoah\tScott\tOperations Manager\tnoah.scott@blueworks.io\t+1-555-268-9158\tCanada\tMarketing\t1-10\tWebsite\tNew\tMedium\t2026-06-05\t2026-06-10\t17000\tLooking for RAG chatbot
L0034\tBrightSystems\tbrightsystems.io\tAmelia\tDavis\tCOO\tamelia.davis@brightsystems.io\t+1-555-325-9772\tPakistan\tEdTech\t1000+\tUpwork\tWon\tMedium\t2026-06-25\t2026-07-06\t20500\tNeeds CRM integration
L0035\tBrightSystems\tbrightsystems.io\tCharlotte\tBaker\tHead of AI\tcharlotte.baker@brightsystems.io\t+1-555-947-2872\tPakistan\tEdTech\t1000+\tConference\tLost\tMedium\t2026-05-28\t2026-06-13\t32000\tInterested in AI automation
L0036\tPrimeDigital\tprimedigital.io\tHarper\tTaylor\tVP Technology\tharper.taylor@primedigital.io\t+1-555-809-3021\tUSA\tSaaS\t501-1000\tCold Email\tProposal Sent\tLow\t2026-06-26\t2026-06-29\t7500\tNeeds CRM integration
L0037\tCloudSystems\tcloudsystems.io\tHenry\tHill\tVP Technology\thenry.hill@cloudsystems.io\t+1-555-529-5663\tGermany\tFinTech\t1-10\tReferral\tNegotiation\tHigh\t2026-06-16\t2026-06-30\t54000\tWants workflow automation
L0038\tNovaTech\tnovatech.io\tMia\tCarter\tCOO\tmia.carter@novatech.io\t+1-555-887-4971\tUAE\tEdTech\t1-10\tUpwork\tWon\tMedium\t2026-06-04\t2026-06-18\t19500\tEvaluating vendors
L0039\tQuantumSystems\tquantumsystems.io\tEmma\tSmith\tCTO\temma.smith@quantumsystems.io\t+1-555-498-3026\tSingapore\tReal Estate\t201-500\tReferral\tProposal Sent\tMedium\t2026-05-31\t2026-06-20\t5500\tInterested in AI automation
L0040\tNextLabs\tnextlabs.io\tJames\tBrown\tHead of AI\tjames.brown@nextlabs.io\t+1-555-577-8888\tAustralia\tFinTech\t11-50\tCold Email\tContacted\tMedium\t2026-06-10\t2026-06-18\t67500\tLooking for RAG chatbot
L0041\tFusionAI\tfusionai.io\tHarper\tSmith\tHead of AI\tharper.smith@fusionai.io\t+1-555-807-4073\tSingapore\tSaaS\t201-500\tWebsite\tWon\tLow\t2026-05-21\t2026-06-06\t31000\tNeeds CRM integration
L0042\tNovaLabs\tnovalabs.io\tIsabella\tScott\tSales Director\tisabella.scott@novalabs.io\t+1-555-248-8137\tUSA\tSaaS\t1000+\tCold Email\tContacted\tHigh\t2026-06-09\t2026-06-14\t73500\tBudget approved
L0043\tPrimeSystems\tprimesystems.io\tHarper\tKing\tHead of AI\tharper.king@primesystems.io\t+1-555-971-1675\tCanada\tRetail\t1-10\tReferral\tWon\tMedium\t2026-05-18\t2026-05-22\t12000\tNeeds CRM integration
L0044\tCloudAI\tcloudai.io\tAmelia\tClark\tOperations Manager\tamelia.clark@cloudai.io\t+1-555-772-5038\tUAE\tSaaS\t51-200\tLinkedIn\tMeeting Scheduled\tLow\t2026-06-02\t2026-06-16\t7500\tRequested demo
L0045\tQuantumSolutions\tquantumsolutions.io\tNoah\tCarter\tFounder\tnoah.carter@quantumsolutions.io\t+1-555-911-1443\tGermany\tRetail\t501-1000\tConference\tNew\tHigh\t2026-06-16\t2026-06-19\t35500\tNeeds CRM integration
L0046\tQuantumTech\tquantumtech.io\tIsabella\tDavis\tHead of AI\tisabella.davis@quantumtech.io\t+1-555-306-8591\tSingapore\tManufacturing\t201-500\tCold Email\tWon\tLow\t2026-05-27\t2026-06-06\t47000\tWants workflow automation
L0047\tBrightLabs\tbrightlabs.io\tLiam\tYoung\tCOO\tliam.young@brightlabs.io\t+1-555-621-4168\tSingapore\tManufacturing\t501-1000\tLinkedIn\tQualified\tHigh\t2026-06-25\t2026-07-06\t33500\tRequested demo
L0048\tNextSystems\tnextsystems.io\tHarper\tJohnson\tProduct Manager\tharper.johnson@nextsystems.io\t+1-555-151-1689\tCanada\tLogistics\t1-10\tUpwork\tProposal Sent\tMedium\t2026-05-22\t2026-05-27\t7000\tInterested in MCP
L0049\tNovaLabs\tnovalabs.io\tAmelia\tBrown\tEngineering Manager\tamelia.brown@novalabs.io\t+1-555-393-3545\tUK\tCybersecurity\t51-200\tUpwork\tMeeting Scheduled\tMedium\t2026-06-18\t2026-06-29\t7500\tInterested in MCP
L0050\tQuantumSolutions\tquantumsolutions.io\tJames\tScott\tHead of AI\tjames.scott@quantumsolutions.io\t+1-555-566-5102\tPakistan\tCybersecurity\t1000+\tReferral\tWon\tHigh\t2026-05-12\t2026-05-15\t46000\tRequested demo
L0051\tBlueSystems\tbluesystems.io\tCharlotte\tSmith\tHead of AI\tcharlotte.smith@bluesystems.io\t+1-555-319-1416\tSingapore\tMarketing\t201-500\tUpwork\tQualified\tLow\t2026-06-18\t2026-07-06\t36000\tEvaluating vendors
L0052\tBrightLabs\tbrightlabs.io\tJack\tSmith\tSales Director\tjack.smith@brightlabs.io\t+1-555-626-7057\tSweden\tSaaS\t1-10\tCold Email\tNegotiation\tHigh\t2026-05-12\t2026-05-21\t38500\tInterested in AI automation
L0053\tBrightSystems\tbrightsystems.io\tLucas\tYoung\tCTO\tlucas.young@brightsystems.io\t+1-555-972-9596\tUAE\tHealthcare\t51-200\tReferral\tLost\tHigh\t2026-06-23\t2026-06-28\t43000\tBudget approved
L0054\tPrimeDigital\tprimedigital.io\tHenry\tTurner\tFounder\thenry.turner@primedigital.io\t+1-555-999-8131\tAustralia\tEdTech\t1000+\tLinkedIn\tProposal Sent\tHigh\t2026-06-04\t2026-06-24\t49000\tInterested in AI automation
L0055\tVertexDigital\tvertexdigital.io\tDaniel\tAllen\tSales Director\tdaniel.allen@vertexdigital.io\t+1-555-701-6459\tAustralia\tReal Estate\t1-10\tConference\tLost\tHigh\t2026-06-09\t2026-06-24\t52000\tWants workflow automation
L0056\tPrimeAI\tprimeai.io\tSophia\tCarter\tVP Technology\tsophia.carter@primeai.io\t+1-555-668-6549\tUAE\tReal Estate\t1-10\tConference\tProposal Sent\tMedium\t2026-06-17\t2026-06-30\t40500\tWants workflow automation
L0057\tNextDigital\tnextdigital.io\tEmma\tTaylor\tCTO\temma.taylor@nextdigital.io\t+1-555-580-1432\tUSA\tManufacturing\t1000+\tConference\tContacted\tHigh\t2026-05-30\t2026-06-02\t72500\tWants workflow automation
L0058\tFusionSolutions\tfusionsolutions.io\tMia\tMoore\tEngineering Manager\tmia.moore@fusionsolutions.io\t+1-555-193-2134\tUSA\tSaaS\t1-10\tReferral\tNew\tMedium\t2026-06-06\t2026-06-25\t35500\tNeeds CRM integration
L0059\tQuantumSystems\tquantumsystems.io\tJack\tSmith\tCTO\tjack.smith@quantumsystems.io\t+1-555-467-8040\tSweden\tMarketing\t501-1000\tCold Email\tWon\tMedium\t2026-06-11\t2026-06-26\t23500\tNeeds CRM integration
L0060\tNovaAI\tnovaai.io\tLiam\tAllen\tCOO\tliam.allen@novaai.io\t+1-555-388-9743\tAustralia\tLogistics\t1000+\tCold Email\tLost\tMedium\t2026-05-23\t2026-06-12\t49000\tBudget approved
L0061\tCloudTech\tcloudtech.io\tNoah\tSmith\tEngineering Manager\tnoah.smith@cloudtech.io\t+1-555-994-6047\tNetherlands\tFinTech\t1000+\tUpwork\tQualified\tMedium\t2026-05-19\t2026-05-27\t5000\tEvaluating vendors
L0062\tFusionLabs\tfusionlabs.io\tJack\tDavis\tCEO\tjack.davis@fusionlabs.io\t+1-555-116-1377\tSingapore\tCybersecurity\t11-50\tLinkedIn\tContacted\tHigh\t2026-06-12\t2026-06-16\t2500\tNeeds CRM integration
L0063\tQuantumLogic\tquantumlogic.io\tJames\tKing\tOperations Manager\tjames.king@quantumlogic.io\t+1-555-428-2706\tGermany\tMarketing\t1000+\tWebsite\tLost\tHigh\t2026-06-04\t2026-06-24\t23500\tRequested demo
L0064\tVisionDigital\tvisiondigital.io\tAva\tKing\tHead of AI\tava.king@visiondigital.io\t+1-555-415-8513\tSingapore\tFinTech\t501-1000\tConference\tContacted\tLow\t2026-05-20\t2026-06-07\t26000\tBudget approved
L0065\tBrightWorks\tbrightworks.io\tBenjamin\tHill\tCTO\tbenjamin.hill@brightworks.io\t+1-555-756-2247\tPakistan\tFinTech\t1-10\tConference\tNew\tLow\t2026-05-12\t2026-05-27\t56000\tInterested in MCP
L0066\tCloudTech\tcloudtech.io\tDaniel\tHill\tCOO\tdaniel.hill@cloudtech.io\t+1-555-697-2712\tCanada\tSaaS\t1-10\tLinkedIn\tWon\tHigh\t2026-06-24\t2026-07-09\t20000\tNeeds CRM integration
L0067\tNovaDigital\tnovadigital.io\tAmelia\tWilson\tVP Technology\tamelia.wilson@novadigital.io\t+1-555-467-4820\tSingapore\tRetail\t1000+\tLinkedIn\tQualified\tMedium\t2026-05-13\t2026-05-19\t57500\tLooking for RAG chatbot
L0068\tFusionDigital\tfusiondigital.io\tEthan\tJohnson\tCOO\tethan.johnson@fusiondigital.io\t+1-555-759-9042\tSweden\tMarketing\t1000+\tLinkedIn\tContacted\tLow\t2026-05-27\t2026-06-06\t26000\tBudget approved
L0069\tVertexSystems\tvertexsystems.io\tHarper\tClark\tFounder\tharper.clark@vertexsystems.io\t+1-555-984-3135\tAustralia\tManufacturing\t1-10\tUpwork\tNew\tLow\t2026-05-27\t2026-06-10\t19500\tEvaluating vendors
L0070\tNextSolutions\tnextsolutions.io\tIsabella\tTurner\tSales Director\tisabella.turner@nextsolutions.io\t+1-555-788-7342\tSingapore\tHealthcare\t1-10\tReferral\tContacted\tMedium\t2026-06-04\t2026-06-12\t20000\tEvaluating vendors
L0071\tPrimeSolutions\tprimesolutions.io\tAiden\tSmith\tEngineering Manager\taiden.smith@primesolutions.io\t+1-555-487-7798\tSweden\tReal Estate\t1000+\tUpwork\tQualified\tMedium\t2026-06-26\t2026-07-01\t23500\tBudget approved
L0072\tNextLabs\tnextlabs.io\tHenry\tBaker\tSales Director\thenry.baker@nextlabs.io\t+1-555-861-5423\tGermany\tRetail\t51-200\tLinkedIn\tLost\tHigh\t2026-06-10\t2026-06-20\t28000\tRequested demo
L0073\tVertexWorks\tvertexworks.io\tNoah\tKing\tFounder\tnoah.king@vertexworks.io\t+1-555-784-8599\tUK\tHealthcare\t1000+\tLinkedIn\tNegotiation\tLow\t2026-06-22\t2026-07-10\t58000\tInterested in AI automation
L0074\tNovaLabs\tnovalabs.io\tGrace\tKing\tHead of AI\tgrace.king@novalabs.io\t+1-555-895-9334\tCanada\tReal Estate\t11-50\tConference\tWon\tLow\t2026-05-15\t2026-05-30\t60500\tEvaluating vendors
L0075\tBrightLogic\tbrightlogic.io\tOlivia\tClark\tFounder\tolivia.clark@brightlogic.io\t+1-555-732-9477\tNetherlands\tManufacturing\t1000+\tReferral\tNegotiation\tLow\t2026-05-16\t2026-06-03\t47000\tInterested in MCP
L0076\tPrimeTech\tprimetech.io\tJames\tJohnson\tVP Technology\tjames.johnson@primetech.io\t+1-555-312-6402\tPakistan\tManufacturing\t1-10\tWebsite\tProposal Sent\tHigh\t2026-06-24\t2026-07-14\t8500\tRequested demo
L0077\tBrightDigital\tbrightdigital.io\tLucas\tCarter\tFounder\tlucas.carter@brightdigital.io\t+1-555-867-4612\tUK\tCybersecurity\t501-1000\tConference\tLost\tLow\t2026-06-16\t2026-06-25\t49000\tWants workflow automation
L0078\tNovaLogic\tnovalogic.io\tGrace\tMoore\tFounder\tgrace.moore@novalogic.io\t+1-555-761-8868\tUK\tMarketing\t501-1000\tWebsite\tProposal Sent\tMedium\t2026-05-23\t2026-06-01\t31500\tWants workflow automation
L0079\tFusionTech\tfusiontech.io\tCharlotte\tSmith\tCEO\tcharlotte.smith@fusiontech.io\t+1-555-213-6103\tSingapore\tReal Estate\t1000+\tWebsite\tWon\tMedium\t2026-05-19\t2026-05-22\t55500\tInterested in MCP
L0080\tBlueDigital\tbluedigital.io\tHarper\tHall\tCOO\tharper.hall@bluedigital.io\t+1-555-327-7134\tUAE\tManufacturing\t1-10\tCold Email\tQualified\tLow\t2026-05-24\t2026-06-08\t27500\tWants workflow automation
L0081\tBrightSystems\tbrightsystems.io\tAva\tBaker\tVP Technology\tava.baker@brightsystems.io\t+1-555-220-9026\tUSA\tSaaS\t201-500\tUpwork\tQualified\tHigh\t2026-06-26\t2026-07-02\t5000\tBudget approved
L0082\tBlueLabs\tbluelabs.io\tEmma\tKing\tHead of AI\temma.king@bluelabs.io\t+1-555-550-7429\tAustralia\tRetail\t1-10\tWebsite\tNew\tLow\t2026-06-20\t2026-07-03\t60000\tWants workflow automation
L0083\tPrimeSystems\tprimesystems.io\tJack\tMoore\tCOO\tjack.moore@primesystems.io\t+1-555-548-1146\tNetherlands\tFinTech\t51-200\tConference\tLost\tLow\t2026-06-13\t2026-06-24\t69000\tInterested in MCP
L0084\tNextSystems\tnextsystems.io\tCharlotte\tBaker\tOperations Manager\tcharlotte.baker@nextsystems.io\t+1-555-761-3551\tSingapore\tRetail\t11-50\tUpwork\tContacted\tLow\t2026-06-05\t2026-06-20\t42000\tBudget approved
L0085\tVisionLabs\tvisionlabs.io\tLiam\tKing\tFounder\tliam.king@visionlabs.io\t+1-555-659-9345\tUAE\tHealthcare\t1000+\tReferral\tQualified\tLow\t2026-05-16\t2026-06-01\t24500\tLooking for RAG chatbot
L0086\tBrightTech\tbrighttech.io\tHarper\tTaylor\tFounder\tharper.taylor@brighttech.io\t+1-555-446-4741\tNetherlands\tLogistics\t201-500\tUpwork\tNegotiation\tLow\t2026-06-08\t2026-06-19\t6500\tRequested demo
L0087\tCloudDigital\tclouddigital.io\tBenjamin\tGreen\tHead of AI\tbenjamin.green@clouddigital.io\t+1-555-731-2337\tUAE\tHealthcare\t1-10\tCold Email\tLost\tLow\t2026-06-09\t2026-06-19\t52000\tNeeds CRM integration
L0088\tBrightSolutions\tbrightsolutions.io\tGrace\tScott\tProduct Manager\tgrace.scott@brightsolutions.io\t+1-555-506-6020\tUK\tFinTech\t201-500\tWebsite\tQualified\tHigh\t2026-05-31\t2026-06-12\t63000\tLooking for RAG chatbot
L0089\tPrimeTech\tprimetech.io\tAmelia\tAdams\tEngineering Manager\tamelia.adams@primetech.io\t+1-555-402-5895\tUK\tSaaS\t51-200\tWebsite\tQualified\tLow\t2026-06-17\t2026-06-21\t40000\tRequested demo
L0090\tVertexSolutions\tvertexsolutions.io\tDaniel\tGreen\tOperations Manager\tdaniel.green@vertexsolutions.io\t+1-555-905-2396\tUSA\tLogistics\t501-1000\tConference\tLost\tMedium\t2026-05-21\t2026-06-09\t14500\tInterested in MCP
L0091\tNovaWorks\tnovaworks.io\tAiden\tYoung\tHead of AI\taiden.young@novaworks.io\t+1-555-639-1871\tUSA\tEdTech\t11-50\tConference\tWon\tLow\t2026-05-20\t2026-06-01\t68500\tLooking for RAG chatbot
L0092\tNextDigital\tnextdigital.io\tNoah\tJohnson\tHead of AI\tnoah.johnson@nextdigital.io\t+1-555-521-5952\tGermany\tSaaS\t201-500\tLinkedIn\tNegotiation\tMedium\t2026-05-17\t2026-05-23\t68500\tEvaluating vendors
L0093\tVertexWorks\tvertexworks.io\tSophia\tScott\tSales Director\tsophia.scott@vertexworks.io\t+1-555-919-1847\tUSA\tLogistics\t1000+\tWebsite\tMeeting Scheduled\tLow\t2026-05-28\t2026-06-12\t60000\tBudget approved
L0094\tQuantumWorks\tquantumworks.io\tLiam\tMoore\tProduct Manager\tliam.moore@quantumworks.io\t+1-555-631-5187\tUSA\tCybersecurity\t11-50\tWebsite\tQualified\tMedium\t2026-06-04\t2026-06-20\t8500\tInterested in AI automation
L0095\tVertexSolutions\tvertexsolutions.io\tJames\tHill\tCOO\tjames.hill@vertexsolutions.io\t+1-555-279-5610\tUK\tRetail\t1000+\tUpwork\tNegotiation\tHigh\t2026-05-18\t2026-05-28\t2500\tNeeds CRM integration
L0096\tNextLabs\tnextlabs.io\tBenjamin\tYoung\tCOO\tbenjamin.young@nextlabs.io\t+1-555-637-5810\tSingapore\tFinTech\t201-500\tUpwork\tContacted\tHigh\t2026-05-29\t2026-06-07\t40500\tEvaluating vendors
L0097\tNextDigital\tnextdigital.io\tEthan\tBaker\tOperations Manager\tethan.baker@nextdigital.io\t+1-555-726-2710\tUAE\tReal Estate\t501-1000\tReferral\tWon\tLow\t2026-05-17\t2026-05-25\t39000\tLooking for RAG chatbot
L0098\tBlueTech\tblutech.io\tEthan\tHill\tFounder\tethan.hill@bluetech.io\t+1-555-705-3029\tCanada\tEdTech\t201-500\tWebsite\tContacted\tMedium\t2026-06-24\t2026-07-04\t47500\tBudget approved
L0099\tVisionDigital\tvisiondigital.io\tOlivia\tTaylor\tSales Director\tolivia.taylor@visiondigital.io\t+1-555-540-1629\tAustralia\tCybersecurity\t51-200\tConference\tContacted\tHigh\t2026-06-17\t2026-06-27\t52500\tInterested in MCP
L0100\tQuantumSystems\tquantumsystems.io\tIsabella\tAllen\tCEO\tisabella.allen@quantumsystems.io\t+1-555-346-1804\tPakistan\tReal Estate\t51-200\tReferral\tQualified\tMedium\t2026-06-17\t2026-07-04\t18000\tInterested in AI automation"""

# ── Import logic ───────────────────────────────────────────────────────────────

def run():
    db = SessionLocal()
    inserted = 0
    skipped  = 0

    for line in RAW.strip().splitlines():
        cols = line.split("\t")
        if len(cols) < 18:
            continue

        (lead_id, company, website, first_name, last_name, job_title,
         email, phone, country, industry, size, source,
         orig_status, priority, last_contact, next_followup,
         deal_value, notes) = cols[:18]

        name    = f"{first_name} {last_name}".strip()
        status  = STATUS_MAP.get(orig_status, "New")
        score   = SCORE_MAP.get(priority, "Warm")
        summary = (
            f"{name}, {job_title} at {company} ({industry}, {country}) | "
            f"${deal_value} | {orig_status} | {notes}"
        )
        message = f"{notes}. Industry: {industry}. Company size: {size}. Country: {country}."

        lead = DBLead(
            name=name,
            email=email,
            company=company,
            role=job_title,
            message=message,
            source=source,
            status=status,
            lead_score=score,
            summary=summary,
        )
        db.add(lead)
        inserted += 1

    db.commit()
    db.close()
    print(f"Import complete: {inserted} leads inserted, {skipped} skipped.")


if __name__ == "__main__":
    run()
