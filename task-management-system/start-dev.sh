#!/bin/bash

echo "=== Task Management and Asset Tracking System ==="
echo "Starting development environment..."
echo ""

# Kill any existing processes
echo "Stopping any existing processes..."
pkill -f "python.*app.py" 2>/dev/null || true
pkill -f "npm start" 2>/dev/null || true

# Start backend
echo "Starting backend server..."
cd backend
python3 app.py &
BACKEND_PID=$!
echo "Backend started with PID: $BACKEND_PID"

# Wait for backend to start
sleep 5

# Test backend
echo "Testing backend connection..."
if curl -s http://localhost:5000/api/health > /dev/null; then
    echo "✓ Backend is running on http://localhost:5000"
else
    echo "✗ Backend failed to start"
    exit 1
fi

# Start frontend in new terminal (background)
echo "Starting frontend server..."
cd ../frontend
npm start &
FRONTEND_PID=$!
echo "Frontend started with PID: $FRONTEND_PID"

echo ""
echo "=== Development servers started ==="
echo "Backend:  http://localhost:5000"
echo "Frontend: http://localhost:3000"
echo ""
echo "Default login credentials:"
echo "Username: superadmin"
echo "Password: SuperAdmin123!"
echo ""
echo "Press Ctrl+C to stop all services"

# Wait for interrupt
trap 'echo "Stopping services..."; kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit' INT
wait