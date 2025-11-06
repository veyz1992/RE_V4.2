import React, { useState, useRef, useMemo } from 'react';
import { XMarkIcon, CheckCircleIcon, UploadIcon } from './icons';

type DocType = 'license' | 'insurance';

interface DocumentUploaderProps {
  onClose: () => void;
  onSubmit: (data: {
    license: { fileName: string },
    insurance: { fileName: string }
  }) => void;
}

const DocumentUploader: React.FC<DocumentUploaderProps> = ({ onClose, onSubmit }) => {
  const [selectedFiles, setSelectedFiles] = useState<{ [key in DocType]: File | null }>({
    license: null,
    insurance: null,
  });

  const licenseInputRef = useRef<HTMLInputElement>(null);
  const insuranceInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>, docType: DocType) => {
    if (event.target.files && event.target.files[0]) {
      setSelectedFiles(prev => ({ ...prev, [docType]: event.target.files![0] }));
    }
  };

  const handleRemoveFile = (docType: DocType) => {
    setSelectedFiles(prev => ({ ...prev, [docType]: null }));
    // Reset file input value
    if (docType === 'license' && licenseInputRef.current) licenseInputRef.current.value = '';
    if (docType === 'insurance' && insuranceInputRef.current) insuranceInputRef.current.value = '';
  };

  const triggerFileInput = (ref: React.RefObject<HTMLInputElement>) => {
    ref.current?.click();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedFiles.license && selectedFiles.insurance) {
      onSubmit({
        license: { fileName: selectedFiles.license.name },
        insurance: { fileName: selectedFiles.insurance.name },
      });
    }
  };

  const isSubmittable = useMemo(() => selectedFiles.license && selectedFiles.insurance, [selectedFiles]);

  const renderDocItem = (docType: DocType, title: string, ref: React.RefObject<HTMLInputElement>) => {
    const file = selectedFiles[docType];
    return (
      <div className="bg-gray-light dark:bg-charcoal-light p-4 rounded-lg border border-gray-border dark:border-gray-dark flex items-center justify-between">
        <div>
          <p className="font-semibold text-charcoal dark:text-text-light">{title}</p>
          {file ? (
            <div className="flex items-center text-sm text-success mt-1">
              <CheckCircleIcon className="w-4 h-4 mr-1.5 animate-check-pop" />
              <span className="truncate max-w-[150px] sm:max-w-xs">{file.name}</span>
            </div>
          ) : (
            <p className="text-sm text-gray dark:text-text-muted">No file selected.</p>
          )}
        </div>
        <div>
          {file ? (
            <button
              type="button"
              onClick={() => handleRemoveFile(docType)}
              className="text-sm font-semibold text-error hover:underline"
            >
              Remove
            </button>
          ) : (
            <>
              <input
                type="file"
                ref={ref}
                onChange={(e) => handleFileChange(e, docType)}
                className="hidden"
                accept=".pdf,.jpg,.jpeg,.png"
              />
              <button
                type="button"
                onClick={() => triggerFileInput(ref)}
                className="py-2 px-4 bg-white dark:bg-charcoal text-charcoal dark:text-text-light font-semibold rounded-lg shadow-sm border border-gray-border dark:border-gray-dark hover:bg-gray-100 dark:hover:bg-gray-dark transition-colors text-sm"
              >
                Upload
              </button>
            </>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-charcoal dark:border dark:border-gray-dark rounded-2xl shadow-2xl w-full max-w-2xl p-8 relative animate-slide-up">
        <style>{`
          @keyframes slide-up { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
          .animate-slide-up { animation: slide-up 0.4s ease-out; }
          @keyframes check-pop {
            0% { transform: scale(0.5); opacity: 0; }
            80% { transform: scale(1.1); opacity: 1; }
            100% { transform: scale(1); opacity: 1; }
          }
          .animate-check-pop {
            animation: check-pop 0.4s ease-out;
          }
        `}</style>
        <button onClick={onClose} className="absolute top-4 right-4 text-gray dark:text-text-muted hover:text-charcoal dark:hover:text-white transition-colors">
          <XMarkIcon className="w-8 h-8" />
        </button>

        <div className="flex items-center mb-6">
          <div className="bg-gold/10 text-gold p-3 rounded-full mr-4">
             <UploadIcon className="w-8 h-8"/>
          </div>
          <div>
              <h2 className="font-sora text-3xl font-bold text-charcoal dark:text-text-light">Upload Documents</h2>
              <p className="text-gray dark:text-text-muted">Submit documents to complete your verification.</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {renderDocItem('license', 'Business License', licenseInputRef)}
          {renderDocItem('insurance', 'Proof of Liability Insurance', insuranceInputRef)}

          <div className="flex justify-end items-center gap-4 pt-6">
            <button
              type="button"
              onClick={onClose}
              className="py-2.5 px-6 bg-white dark:bg-charcoal-light text-charcoal dark:text-text-light font-semibold rounded-lg shadow-md border border-gray-border dark:border-gray-dark hover:bg-gray-100 dark:hover:bg-gray-dark transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!isSubmittable}
              className="py-2.5 px-8 bg-gold text-charcoal font-bold rounded-lg shadow-lg hover:bg-gold-light transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:scale-100"
            >
              Submit for Verification
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default DocumentUploader;
