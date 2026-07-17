import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { Check, ChevronDown, Search } from 'lucide-react';

const isSelectableOption = (option) => option && !option.disabled;

const CustomSelect = ({
  id,
  value,
  onChange,
  options = [],
  ariaLabel,
  disabled = false,
  placeholder = 'Select an option',
  className = '',
  buttonClassName = '',
  listClassName = '',
  leftIcon = null,
  searchable = false,
  searchPlaceholder = 'Search...',
}) => {
  const generatedId = useId();
  const selectId = id || `custom-select-${generatedId}`;
  const listboxId = `${selectId}-listbox`;

  const rootRef = useRef(null);
  const buttonRef = useRef(null);
  const optionRefs = useRef([]);
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [searchTerm, setSearchTerm] = useState('');

  const selectedIndex = useMemo(
    () => options.findIndex((option) => String(option.value) === String(value)),
    [options, value]
  );
  const filteredOptions = useMemo(() => {
    if (!searchable || !searchTerm.trim()) {
      return options;
    }

    const normalizedSearch = searchTerm.trim().toLowerCase();
    return options.filter((option) =>
      String(option.label || option.value || '')
        .toLowerCase()
        .includes(normalizedSearch)
    );
  }, [options, searchable, searchTerm]);

  const selectedOption = selectedIndex >= 0 ? options[selectedIndex] : null;
  const selectedLabel = selectedOption?.label || placeholder;

  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }

    const onClickOutside = (event) => {
      if (!rootRef.current?.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    if (activeIndex >= 0 && optionRefs.current[activeIndex]) {
      optionRefs.current[activeIndex].scrollIntoView({
        block: 'nearest',
      });
    }
  }, [activeIndex, isOpen]);

  const openListbox = () => {
    if (disabled) {
      return;
    }

    setSearchTerm('');
    const fallbackIndex = options.findIndex(isSelectableOption);
    const nextIndex = selectedIndex >= 0 ? selectedIndex : fallbackIndex;
    setActiveIndex(nextIndex);
    setIsOpen(true);
  };

  const closeListbox = () => {
    setIsOpen(false);
    setSearchTerm('');
  };

  const moveActiveIndex = (direction) => {
    if (!filteredOptions.length) {
      return;
    }

    let nextIndex = activeIndex;
    const guardCount = filteredOptions.length * 2;
    let iterations = 0;

    while (iterations < guardCount) {
      nextIndex = (nextIndex + direction + filteredOptions.length) % filteredOptions.length;
      if (isSelectableOption(filteredOptions[nextIndex])) {
        setActiveIndex(nextIndex);
        return;
      }
      iterations += 1;
    }
  };

  const selectByIndex = (index) => {
    const option = filteredOptions[index];
    if (!option || option.disabled) {
      return;
    }

    onChange?.(option.value);
    setIsOpen(false);
    buttonRef.current?.focus();
  };

  const onButtonKeyDown = (event) => {
    if (disabled) {
      return;
    }

    switch (event.key) {
      case 'ArrowDown':
      case 'ArrowUp':
        event.preventDefault();
        if (!isOpen) {
          openListbox();
        } else {
          moveActiveIndex(event.key === 'ArrowDown' ? 1 : -1);
        }
        break;
      case 'Enter':
      case ' ':
        event.preventDefault();
        if (isOpen) {
          if (activeIndex >= 0) {
            selectByIndex(activeIndex);
          }
        } else {
          openListbox();
        }
        break;
      case 'Escape':
        if (isOpen) {
          event.preventDefault();
          closeListbox();
        }
        break;
      default:
        break;
    }
  };

  const onListboxKeyDown = (event) => {
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        moveActiveIndex(1);
        break;
      case 'ArrowUp':
        event.preventDefault();
        moveActiveIndex(-1);
        break;
      case 'Home':
        event.preventDefault();
        setActiveIndex(filteredOptions.findIndex(isSelectableOption));
        break;
      case 'End': {
        event.preventDefault();
        const reversedIndex = [...filteredOptions].reverse().findIndex(isSelectableOption);
        if (reversedIndex >= 0) {
          setActiveIndex(filteredOptions.length - 1 - reversedIndex);
        }
        break;
      }
      case 'Enter':
      case ' ':
        event.preventDefault();
        if (activeIndex >= 0) {
          selectByIndex(activeIndex);
        }
        break;
      case 'Escape':
        event.preventDefault();
        closeListbox();
        buttonRef.current?.focus();
        break;
      case 'Tab':
        closeListbox();
        break;
      default:
        break;
    }
  };

  const handleSearchChange = (event) => {
    const nextSearchTerm = event.target.value;
    const normalizedSearch = nextSearchTerm.trim().toLowerCase();
    const nextOptions = normalizedSearch
      ? options.filter((option) =>
          String(option.label || option.value || '')
            .toLowerCase()
            .includes(normalizedSearch)
        )
      : options;

    setSearchTerm(nextSearchTerm);
    setActiveIndex(nextOptions.findIndex(isSelectableOption));
  };

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      <button
        ref={buttonRef}
        type="button"
        id={selectId}
        disabled={disabled}
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-controls={listboxId}
        className={`group w-full rounded-xl border border-[#ccd6e4] bg-[#f7f9fc] py-3 text-left text-sm text-brand-dark shadow-[0_8px_20px_rgba(11,31,58,0.05)] transition-all hover:border-brand-accent/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent/50 disabled:cursor-not-allowed disabled:opacity-60 ${leftIcon ? 'pl-11 pr-10' : 'px-4 pr-10'} ${buttonClassName}`}
        onClick={() => (isOpen ? closeListbox() : openListbox())}
        onKeyDown={onButtonKeyDown}
      >
        {leftIcon ? (
          <span className="pointer-events-none absolute inset-y-0 left-3.5 flex items-center text-[#93a5bf]">
            {leftIcon}
          </span>
        ) : null}
        <span className={`${!selectedOption ? 'text-gray-400' : ''}`}>{selectedLabel}</span>
        <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-[#c9a227]">
          <ChevronDown
            size={18}
            className={`transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
          />
        </span>
      </button>

      {isOpen ? (
        <div className="absolute z-50 mt-2 w-full overflow-hidden rounded-xl border border-[#d7dfeb] bg-[#fafbfd] shadow-[0_22px_40px_rgba(11,31,58,0.16)]">
          {searchable ? (
            <div className="border-b border-[#e2e8f0] bg-white p-2">
              <label className="relative block">
                <Search
                  size={15}
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#93a5bf]"
                />
                <input
                  type="search"
                  value={searchTerm}
                  onChange={handleSearchChange}
                  onKeyDown={onListboxKeyDown}
                  placeholder={searchPlaceholder}
                  className="w-full rounded-lg border border-[#d7dfeb] bg-[#f7f9fc] py-2 pl-9 pr-3 text-sm text-brand-dark outline-none transition focus:border-brand-accent"
                />
              </label>
            </div>
          ) : null}
          <ul
            role="listbox"
            id={listboxId}
            aria-labelledby={selectId}
            tabIndex={-1}
            className={`max-h-64 w-full overflow-auto py-1.5 ${listClassName}`}
            onKeyDown={onListboxKeyDown}
          >
            {filteredOptions.length === 0 ? (
              <li className="mx-1 rounded-lg px-3 py-3 text-sm text-gray-400">No matching options</li>
            ) : (
              filteredOptions.map((option, index) => {
                const isSelected = String(option.value) === String(value);
                const isActive = index === activeIndex;

                return (
                  <li
                    key={`${option.value}-${index}`}
                    id={`${listboxId}-option-${index}`}
                    ref={(element) => {
                      optionRefs.current[index] = element;
                    }}
                    role="option"
                    aria-selected={isSelected}
                    className={`mx-1 flex cursor-pointer items-center justify-between rounded-lg px-3 py-2 text-sm transition-colors ${
                      option.disabled
                        ? 'cursor-not-allowed text-gray-300'
                        : isActive
                          ? 'bg-[#e8edf5] text-brand-dark'
                          : isSelected
                            ? 'bg-[#f1f4fa] text-brand-dark'
                            : 'text-[#1c3a61] hover:bg-[#edf1f8]'
                    }`}
                    onMouseEnter={() => {
                      if (!option.disabled) {
                        setActiveIndex(index);
                      }
                    }}
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => selectByIndex(index)}
                  >
                    <span>{option.label}</span>
                    {isSelected ? <Check size={15} className="text-brand-accent" /> : null}
                  </li>
                );
              })
            )}
          </ul>
        </div>
      ) : null}
    </div>
  );
};

export default CustomSelect;
