import { useToastStore, toast } from '../../src/components/Toast';

describe('Toast Store', () => {
  beforeEach(() => {
    useToastStore.setState({ messages: [] });
  });

  it('should add a success message', () => {
    toast.success('Operation succeeded');

    const messages = useToastStore.getState().messages;
    expect(messages).toHaveLength(1);
    expect(messages[0].type).toBe('success');
    expect(messages[0].text).toBe('Operation succeeded');
  });

  it('should add an error message', () => {
    toast.error('Something went wrong');

    const messages = useToastStore.getState().messages;
    expect(messages).toHaveLength(1);
    expect(messages[0].type).toBe('error');
    expect(messages[0].text).toBe('Something went wrong');
  });

  it('should add an info message', () => {
    toast.info('Some information');

    const messages = useToastStore.getState().messages;
    expect(messages).toHaveLength(1);
    expect(messages[0].type).toBe('info');
  });

  it('should dismiss a message', () => {
    toast.success('To be dismissed');

    const messages = useToastStore.getState().messages;
    const id = messages[0].id;

    useToastStore.getState().dismiss(id);

    expect(useToastStore.getState().messages).toHaveLength(0);
  });

  it('should handle multiple messages', () => {
    toast.success('First');
    toast.error('Second');
    toast.info('Third');

    expect(useToastStore.getState().messages).toHaveLength(3);
  });

  it('should only dismiss the targeted message', () => {
    toast.success('Keep me');
    toast.error('Remove me');

    const messages = useToastStore.getState().messages;
    const removeId = messages[1].id;

    useToastStore.getState().dismiss(removeId);

    const remaining = useToastStore.getState().messages;
    expect(remaining).toHaveLength(1);
    expect(remaining[0].text).toBe('Keep me');
  });
});
