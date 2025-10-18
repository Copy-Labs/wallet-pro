import { type ReactNode, useState } from 'react';
import { CopyToClipboard } from 'react-copy-to-clipboard';
import { toast } from 'sonner';

const CopyTextComponent = ({
  textToCopy,
  feedbackMessage,
  clearClipboard = false,
  icon,
  successIcon,
  children,
}: {
  textToCopy: string;
  feedbackMessage?: string;
  clearClipboard?: boolean;
  icon?: ReactNode,
  successIcon?: ReactNode,
  children?: ReactNode;
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    setCopied(true);
    toast(feedbackMessage || 'Address copied to clipboard', { duration: 1000 });
    setTimeout(() => setCopied(false), 2400)
    // TODO: Implement clearing clipboard functionality
  };

  return (
    <div>
      <CopyToClipboard text={textToCopy} onCopy={handleCopy}>
        {icon ? (
          <div className="flex items-center gap-2">
            {copied ? successIcon : icon}
          </div>
        ) : children}
      </CopyToClipboard>

      {/* {copied && <p style={{ color: "green" }}>Text copied to clipboard!</p>} */}
    </div>
  );
};

export default CopyTextComponent;
