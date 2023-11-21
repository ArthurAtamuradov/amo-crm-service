# AmoCRM Service

## Description

The AmoCRM Service is a Node.js service built with NestJS for interacting with the AmoCRM API. It provides functionality to find or create contacts and deals in AmoCRM based on user data.

## Installation

1. Clone the repository.
2. Install dependencies with `npm install`.
3. Set up the necessary environment variables (see Configuration section).
4. Start the service using `npm start`.

## Usage

1. Configure the service by providing the required environment variables.
2. Start the service using `npm start`.
3. Access the service at `http://localhost:3000`.

## Configuration

- **Environment Variables:**
  - `AMO_API_URL`: URL of the AmoCRM API.
  - `AMO_API_KEY`: Your AmoCRM API key.
  - `PORT`: The port on which the service runs (default is 3000).


## Testing

1. Run unit tests with `npm test`.
2. For end-to-end tests, use a testing framework of your choice.
