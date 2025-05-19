# Shared Calendar App

A real-time calendar app that allows two people to coordinate their schedules.

## Features

- View availability for two people across multiple days
- Mark time slots as Available, Unavailable, TBD, or Planned
- Real-time synchronization between devices using Firebase
- Visual indicators when both people are available
- Simple user authentication
- Mobile-friendly design

## How to Use

1. Visit the app URL (will be available after deployment)
2. Enter your name
3. Tap on any time slot to change its status:
   - Available (A) - green
   - Unavailable (UA) - red
   - TBD (?) - yellow
   - Planned (■) - purple
4. When both people mark a slot as "Available", a green dot appears
5. When a slot is marked as "Planned", it automatically updates for both people

## Technologies Used

- React
- Firebase Realtime Database
- Tailwind CSS
- Vercel (hosting)
