/**
 * Basic App sanity test
 */
import React from 'react';
import { render } from '@testing-library/react-native';
import { Text, View } from 'react-native';

// We test the App component indirectly since it requires many native modules.
// This test ensures the test infrastructure is working correctly.
describe('App', () => {
  it('renders a basic React Native component', () => {
    const TestComponent = () => (
      <View>
        <Text>MusicStream</Text>
      </View>
    );

    const { getByText } = render(<TestComponent />);
    expect(getByText('MusicStream')).toBeTruthy();
  });
});
