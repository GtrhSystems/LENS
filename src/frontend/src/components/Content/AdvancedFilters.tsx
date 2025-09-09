import React from 'react';
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  ModalCloseButton,
  Button,
  VStack,
  HStack,
  FormControl,
  FormLabel,
  Input,
  Select,
  RangeSlider,
  RangeSliderTrack,
  RangeSliderFilledTrack,
  RangeSliderThumb,
  Text,
  Checkbox,
  CheckboxGroup,
  Wrap,
  WrapItem,
  Divider
} from '@chakra-ui/react';
import { ContentFilters } from '../../types/content';

interface AdvancedFiltersProps {
  isOpen: boolean;
  onClose: () => void;
  filters: ContentFilters;
  filterOptions: any;
  onFiltersChange: (filters: Partial<ContentFilters>) => void;
}

const AdvancedFilters: React.FC<AdvancedFiltersProps> = ({
  isOpen,
  onClose,
  filters,
  filterOptions,
  onFiltersChange
}) => {
  const [localFilters, setLocalFilters] = React.useState(filters);
  const [ratingRange, setRatingRange] = React.useState([0, 10]);
  const [yearRange, setYearRange] = React.useState([1900, new Date().getFullYear()]);
  
  React.useEffect(() => {
    setLocalFilters(filters);
  }, [filters]);
  
  const handleApplyFilters = () => {
    onFiltersChange({
      ...localFilters,
      minRating: ratingRange[0],
      maxRating: ratingRange[1],
      minYear: yearRange[0],
      maxYear: yearRange[1]
    });
    onClose();
  };
  
  const handleResetFilters = () => {
    const resetFilters = {
      search: '',
      genre: '',
      year: '',
      quality: '',
      language: '',
      director: '',
      actor: '',
      minRating: 0,
      maxRating: 10,
      minYear: 1900,
      maxYear: new Date().getFullYear(),
      page: 1,
      limit: 50
    };
    setLocalFilters(resetFilters);
    setRatingRange([0, 10]);
    setYearRange([1900, new Date().getFullYear()]);
  };
  
  return (
    <Modal isOpen={isOpen} onClose={onClose} size="2xl">
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>Filtros Avanzados</ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <VStack spacing={6} align="stretch">
            {/* Basic Filters */}
            <VStack spacing={4} align="stretch">
              <Text fontWeight="semibold">Filtros Básicos</Text>
              
              <HStack>
                <FormControl>
                  <FormLabel>Búsqueda</FormLabel>
                  <Input
                    value={localFilters.search}
                    onChange={(e) => setLocalFilters(prev => ({ ...prev, search: e.target.value }))}
                    placeholder="Título, actor, director..."
                  />
                </FormControl>
                
                <FormControl>
                  <FormLabel>Género</FormLabel>
                  <Select
                    value={localFilters.genre}
                    onChange={(e) => setLocalFilters(prev => ({ ...prev, genre: e.target.value }))}
                  >
                    <option value="">Todos los géneros</option>
                    {filterOptions?.genres?.map((genre: string) => (
                      <option key={genre} value={genre}>{genre}</option>
                    ))}
                  </Select>
                </FormControl>
              </HStack>
              
              <HStack>
                <FormControl>
                  <FormLabel>Calidad</FormLabel>
                  <Select
                    value={localFilters.quality}
                    onChange={(e) => setLocalFilters(prev => ({ ...prev, quality: e.target.value }))}
                  >
                    <option value="">Todas las calidades</option>
                    {filterOptions?.qualities?.map((quality: string) => (
                      <option key={quality} value={quality}>{quality}</option>
                    ))}
                  </Select>
                </FormControl>
                
                <FormControl>
                  <FormLabel>Idioma</FormLabel>
                  <Select
                    value={localFilters.language}
                    onChange={(e) => setLocalFilters(prev => ({ ...prev, language: e.target.value }))}
                  >
                    <option value="">Todos los idiomas</option>
                    {filterOptions?.languages?.map((language: string) => (
                      <option key={language} value={language}>{language}</option>
                    ))}
                  </Select>
                </FormControl>
              </HStack>
            </VStack>
            
            <Divider />
            
            {/* Advanced Filters */}
            <VStack spacing={4} align="stretch">
              <Text fontWeight="semibold">Filtros Avanzados</Text>
              
              <HStack>
                <FormControl>
                  <FormLabel>Director</FormLabel>
                  <Input
                    value={localFilters.director || ''}
                    onChange={(e) => setLocalFilters(prev => ({ ...prev, director: e.target.value }))}
                    placeholder="Nombre del director"
                  />
                </FormControl>
                
                <FormControl>
                  <FormLabel>Actor</FormLabel>
                  <Input
                    value={localFilters.actor || ''}
                    onChange={(e) => setLocalFilters(prev => ({ ...prev, actor: e.target.value }))}
                    placeholder="Nombre del actor"
                  />
                </FormControl>
              </HStack>
              
              <FormControl>
                <FormLabel>Rango de Rating: {ratingRange[0]} - {ratingRange[1]}</FormLabel>
                <RangeSlider
                  value={ratingRange}
                  onChange={setRatingRange}
                  min={0}
                  max={10}
                  step={0.1}
                >
                  <RangeSliderTrack>
                    <RangeSliderFilledTrack />
                  </RangeSliderTrack>
                  <RangeSliderThumb index={0} />
                  <RangeSliderThumb index={1} />
                </RangeSlider>
              </FormControl>
              
              <FormControl>
                <FormLabel>Rango de Años: {yearRange[0]} - {yearRange[1]}</FormLabel>
                <RangeSlider
                  value={yearRange}
                  onChange={setYearRange}
                  min={1900}
                  max={new Date().getFullYear()}
                  step={1}
                >
                  <RangeSliderTrack>
                    <RangeSliderFilledTrack />
                  </RangeSliderTrack>
                  <RangeSliderThumb index={0} />
                  <RangeSliderThumb index={1} />
                </RangeSlider>
              </FormControl>
            </VStack>
          </VStack>
        </ModalBody>
        
        <ModalFooter>
          <HStack>
            <Button variant="ghost" onClick={handleResetFilters}>
              Limpiar Todo
            </Button>
            <Button variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button colorScheme="blue" onClick={handleApplyFilters}>
              Aplicar Filtros
            </Button>
          </HStack>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

export default AdvancedFilters;