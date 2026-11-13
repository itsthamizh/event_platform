import { render, screen } from '@testing-library/react';
import App from './App';

test('renders the customer home page', () => {
  render(<App />);
  expect(screen.getByText(/Pick what you need/i)).toBeInTheDocument();
});
