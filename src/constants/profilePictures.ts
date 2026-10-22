// Predefined profile pictures for users
export const PROFILE_PICTURES = [
  {
    id: 'avatar-1',
    name: 'Professional Blue',
    emoji: '👨‍💼',
    color: 'bg-blue-500',
  },
  {
    id: 'avatar-2',
    name: 'Energetic Orange',
    emoji: '🧑‍🚀',
    color: 'bg-orange-500',
  },
  {
    id: 'avatar-3',
    name: 'Calm Green',
    emoji: '🧑‍🌾',
    color: 'bg-green-500',
  },
  {
    id: 'avatar-4',
    name: 'Creative Purple',
    emoji: '🎨',
    color: 'bg-purple-500',
  },
  {
    id: 'avatar-5',
    name: 'Bold Red',
    emoji: '🧑‍⚖️',
    color: 'bg-red-500',
  },
  {
    id: 'avatar-6',
    name: 'Reliable Teal',
    emoji: '👷',
    color: 'bg-teal-500',
  },
  {
    id: 'avatar-7',
    name: 'Friendly Yellow',
    emoji: '🧑‍🍳',
    color: 'bg-yellow-500',
  },
  {
    id: 'avatar-8',
    name: 'Tech Gray',
    emoji: '🧑‍💻',
    color: 'bg-gray-500',
  },
  {
    id: 'avatar-9',
    name: 'Nature Emerald',
    emoji: '🌿',
    color: 'bg-emerald-500',
  },
  {
    id: 'avatar-10',
    name: 'Ocean Indigo',
    emoji: '🌊',
    color: 'bg-indigo-500',
  },
  {
    id: 'avatar-11',
    name: 'Warm Rose',
    emoji: '🌹',
    color: 'bg-rose-500',
  },
  {
    id: 'avatar-12',
    name: 'Royal Amber',
    emoji: '👑',
    color: 'bg-amber-500',
  },
];

export const GREETINGS = [
  'Waguan',
  'Back at it!',
  'Shii Sup',
  'Waddup',
];

// Function to get a random profile picture
export function getRandomProfilePicture() {
  const randomIndex = Math.floor(Math.random() * PROFILE_PICTURES.length);
  return PROFILE_PICTURES[randomIndex];
}

// Function to get a random greeting
export function getRandomGreeting() {
  const randomIndex = Math.floor(Math.random() * GREETINGS.length);
  return GREETINGS[randomIndex];
}
