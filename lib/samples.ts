import type { CampaignInput, ContentPack } from "./content";

export type Sample = {
  id: string;
  label: string;
  description: string;
  input: CampaignInput;
  pack: ContentPack;
};

export const SAMPLES: Sample[] = [
  {
    id: "handyman",
    label: "Sample Demo: Handyman service",
    description: "Friendly neighborhood repair campaign",
    input: {
      businessName: "Harbor Handyman",
      businessFacts:
        "Home repair and maintenance service in Portland, Maine. Services include drywall repair, fixture installation, furniture assembly, and seasonal maintenance.",
      targetAudience: "Busy homeowners in the Portland area",
      topic: "Seasonal home maintenance appointments",
      tone: "Friendly",
      nextAction: "Request an appointment",
      avoid: "Do not mention prices or emergency service",
    },
    pack: {
      socialPosts: [
        "Small fixes have a way of piling up. Harbor Handyman helps Portland-area homeowners move drywall repairs, fixture installation, furniture assembly, and seasonal maintenance off the list. Request an appointment when you’re ready.",
        "Getting your home ready for the next season? Harbor Handyman provides practical seasonal maintenance and everyday home repairs for busy homeowners around Portland, Maine. Request an appointment to get started.",
        "That fixture waiting to be installed. The shelf still in its box. The drywall patch you keep noticing. Harbor Handyman can help Portland-area homeowners take care of the details. Request an appointment.",
      ],
      email: {
        subject: "Ready to tackle your home maintenance list?",
        body:
          "Hi there,\n\nSeasonal maintenance is a good time to take care of the small repairs and projects around your home. Harbor Handyman serves Portland-area homeowners with drywall repair, fixture installation, furniture assembly, and seasonal maintenance.\n\nRequest an appointment when you’re ready to shorten your list.",
      },
      videoScript:
        "Is your home maintenance list getting longer? Harbor Handyman helps busy homeowners in the Portland area with drywall repair, fixture installation, furniture assembly, and seasonal upkeep. Take a look around your home, choose the projects you want handled, and request an appointment with Harbor Handyman.",
      detailsToConfirm: [],
    },
  },
  {
    id: "events",
    label: "Sample Demo: Event-service business",
    description: "Professional event coordination launch",
    input: {
      businessName: "Bright Table Events",
      businessFacts:
        "Event coordination service in Austin, Texas. Supports corporate gatherings, nonprofit events, and private celebrations with planning timelines, vendor coordination, and day-of coordination.",
      targetAudience: "Austin teams and hosts planning polished gatherings",
      topic: "Day-of event coordination",
      tone: "Professional",
      nextAction: "Schedule a consultation",
      avoid: "Do not promise a stress-free event",
    },
    pack: {
      socialPosts: [
        "A strong event plan deserves careful execution. Bright Table Events provides day-of coordination for Austin corporate gatherings, nonprofit events, and private celebrations. Schedule a consultation to discuss your event.",
        "When the event day arrives, your timeline, vendors, and key details need a clear point of coordination. Bright Table Events supports Austin teams and hosts with professional day-of event coordination.",
        "You’ve made the decisions. Bright Table Events helps carry the plan through on event day, coordinating timelines and vendors for gatherings across Austin. Schedule a consultation to learn more.",
      ],
      email: {
        subject: "Keep your event plan moving on the day",
        body:
          "Hello,\n\nThoughtful planning matters, and so does coordinated execution. Bright Table Events supports Austin corporate gatherings, nonprofit events, and private celebrations with day-of timeline and vendor coordination.\n\nSchedule a consultation to discuss the support your gathering needs.",
      },
      videoScript:
        "Your event plan brings together a timeline, vendors, and dozens of details. On the day, Bright Table Events helps keep those pieces moving. We provide day-of coordination for corporate gatherings, nonprofit events, and private celebrations in Austin. Schedule a consultation to discuss your plans.",
      detailsToConfirm: [],
    },
  },
  {
    id: "fitness",
    label: "Sample Demo: Fitness coach",
    description: "Direct coaching program introduction",
    input: {
      businessName: "Northline Fitness Coaching",
      businessFacts:
        "Online fitness coaching with individualized strength plans, weekly check-ins, and form feedback. Coaching is delivered remotely.",
      targetAudience: "Adults who want a structured strength routine at home or in a gym",
      topic: "Individualized online strength coaching",
      tone: "Direct",
      nextAction: "Apply for coaching",
      avoid: "No weight-loss promises, before-and-after claims, or guarantees",
    },
    pack: {
      socialPosts: [
        "Stop guessing what to do next. Northline Fitness Coaching builds an individualized strength plan around your routine, with weekly check-ins and form feedback delivered online. Apply for coaching.",
        "A useful strength routine needs structure and adjustment. Get an individualized plan, remote form feedback, and weekly check-ins from Northline Fitness Coaching. Train at home or in a gym.",
        "Your plan should fit how and where you train. Northline Fitness Coaching provides remote strength programming, weekly check-ins, and form feedback for adults who want a clear routine. Apply for coaching.",
      ],
      email: {
        subject: "Build a strength routine with a clear plan",
        body:
          "You don’t need another random workout. Northline Fitness Coaching provides an individualized strength plan, weekly check-ins, and form feedback—all delivered remotely for training at home or in a gym.\n\nApply for coaching to start the conversation.",
      },
      videoScript:
        "Want a strength routine you can actually follow? Northline Fitness Coaching gives you an individualized plan, weekly check-ins, and form feedback online. Whether you train at home or in a gym, you’ll have a clear structure for each session. Apply for coaching to get started.",
      detailsToConfirm: [],
    },
  },
];
